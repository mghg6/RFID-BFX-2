import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { IconButton, Box, Typography, Modal, Paper, Button, TextField } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PrintIcon from '@mui/icons-material/Print';
import ArticleIcon from '@mui/icons-material/Article';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import { DataGrid, GridToolbar, GridRowsProp, GridColDef } from '@mui/x-data-grid';
import Swal from 'sweetalert2';
import './catalogobfx.scss';
import DeleteIcon from '@mui/icons-material/Delete';
import jsPDF from 'jspdf';

interface RowData {
  id: number;
  area: string;
  fecha: string;
  claveProducto: string;
  nombreProducto: string;
  turno: string;
  operador: string;
  pesoBruto: number;
  pesoNeto: number;
  pesoTarima: number;
  piezas: number;
  trazabilidad: string;
  orden: number;
  rfid: string;
  uom: string;
  status: string;
}

interface Printer {
  id: number;
  name: string;
  ip: string;
}

const getClaveUnidad = (uom: string | null): string => {
  switch (uom) {
    case 'Millares':
      return 'MIL';
    case 'Piezas':
      return 'PZAS';
    case 'Cajas':
      return 'XBX';
    default:
      return '';
  }
};

const CatalogoBFX: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<GridRowsProp>([]);
  const [openModal, setOpenModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState<RowData | null>(null);
  const [editData, setEditData] = useState({ pesoTarima: 0, pesoBruto: 0, pesoNeto: 0, piezas: 0 });
  const [printers, setPrinters] = useState<Printer[]>([
    { id: 1, name: 'Impresora 1', ip: '172.16.20.56' },
    { id: 2, name: 'Impresora 2', ip: '172.16.20.57' },
    { id: 3, name: 'Impresora 3', ip: '172.16.20.112' }
  ]);

  useEffect(() => {
    axios.get('http://172.16.10.31/api/RfidLabel')
      .then(response => setRows(response.data))
      .catch(error => console.error('Error fetching data:', error));
  }, []);

  const handlePreviewClick = (row: RowData) => {
    setSelectedRow(row);
    setOpenModal(true);
  };

  const handlePrintClick = (row: RowData) => {
    setSelectedRow(row);
    showPrinterSelection();
  };

  const showPrinterSelection = () => {
    Swal.fire({
      title: 'Seleccionar Impresora',
      input: 'select',
      inputOptions: printers.reduce((options, printer) => {
        options[printer.id] = printer.name;
        return options;
      }, {} as Record<number, string>),
      inputPlaceholder: 'Selecciona una impresora',
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar',
      preConfirm: (selectedPrinterId) => {
        const selectedPrinter = printers.find(printer => printer.id === Number(selectedPrinterId));
        if (!selectedPrinter) {
          Swal.showValidationMessage('Por favor, selecciona una impresora');
        }
        return selectedPrinter;
      }
    }).then((result) => {
      if (result.isConfirmed && result.value && selectedRow) {
        const selectedPrinter = result.value as Printer;
        const postData = {
          area: selectedRow.area,
          claveProducto: selectedRow.claveProducto,
          nombreProducto: selectedRow.nombreProducto,
          claveOperador: selectedRow.operador,
          operador: selectedRow.operador,
          turno: selectedRow.turno,
          pesoTarima: selectedRow.pesoTarima,
          pesoBruto: selectedRow.pesoBruto,
          pesoNeto: selectedRow.pesoNeto,
          piezas: selectedRow.piezas,
          trazabilidad: selectedRow.trazabilidad,
          orden: selectedRow.orden.toString(),
          rfid: selectedRow.rfid,
          status: selectedRow.status,
          uom: selectedRow.uom,
          fecha: selectedRow.fecha
        };

        axios.post(`http://172.16.10.31/Printer/PrintBfxLabel?ip=${selectedPrinter.ip}`, postData)
          .then(response => {
            console.log('Impresión iniciada:', response.data);
            Swal.fire('Éxito', 'Impresión iniciada correctamente', 'success');
          })
          .catch(error => {
            console.error('Error al imprimir:', error);
            Swal.fire('Error', 'Hubo un error al iniciar la impresión', 'error');
          });
      }
    });
  };

  const handleDeleteClick = (row: RowData) => {
    Swal.fire({
      title: '¿Estás seguro?',
      text: `Seguro que quieres eliminar la trazabilidad: ${row.trazabilidad}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminarlo'
    }).then((result) => {
      if (result.isConfirmed) {
        axios.delete(`http://172.16.10.31/api/RfidLabel/${row.trazabilidad}`)
          .then(response => {
            Swal.fire(
              'Eliminado!',
              'La etiqueta ha sido eliminada.',
              'success'
            );
            setRows(rows.filter(r => r.trazabilidad !== row.trazabilidad));
          })
          .catch(error => {
            Swal.fire(
              'Error!',
              'Hubo un problema al eliminar la etiqueta.',
              'error'
            );
            console.error('Error al eliminar la etiqueta:', error);
          });
      }
    });
  };

  const formatDate = (dateTime: string): string => {
    const date = new Date(dateTime);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Meses comienzan en 0
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const handleCloseModal = () => {
    setOpenModal(false);
  };

  const handleGeneratePDFClick = (row: RowData) => {
    generatePDF(row);
  };

  const generatePDF = (data: RowData) => {
    const { claveProducto, nombreProducto, pesoBruto, orden, fecha, pesoNeto, piezas } = data;
    const claveUnidad = getClaveUnidad(data.uom);
    const formattedDate = formatDate(fecha);

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'letter'
    });

    const splitText = (text: string, x: number, y: number, fontSize: number, maxWidth: number): number => {
      doc.setFontSize(fontSize);
      const lines: string[] = doc.splitTextToSize(text, maxWidth);
      lines.forEach((line: string) => {
        doc.text(line, x, y);
        y += fontSize * 0.4;
      });
      return y;
    };

    doc.setFontSize(150);
    doc.text(`${claveProducto}`, 25, 45);

    let currentY = 80;
    currentY = splitText(nombreProducto, 10, currentY, 45, 260);

    doc.setFontSize(40);
    doc.text(`LOTE:${orden}`, 20, 161);
    doc.text(`${formattedDate} `, 155, 161);

    doc.text(`KGM`, 80, 180);

    doc.setFontSize(80);
    doc.text(`${pesoNeto}`, 5, 207);
    doc.text(`${piezas} ${claveUnidad}`, 122, 207);

    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(5, 55, 275, 55);
    doc.line(5, 145, 275, 145);
    doc.line(5, 167, 275, 167);
    doc.line(117, 167, 117, 210);
    window.open(doc.output('bloburl'), '_blank');
  };

  const handleEditClick = (row: RowData) => {
    setSelectedRow(row);
    setEditData({
      pesoTarima: row.pesoTarima,
      pesoBruto: row.pesoBruto,
      pesoNeto: row.pesoNeto,
      piezas: row.piezas
    });
    setOpenEditModal(true);
  };

  const handleEditSubmit = () => {
    // Validaciones de pesos
    if (editData.pesoBruto !== undefined && editData.pesoNeto !== undefined) {
      if (editData.pesoBruto < editData.pesoNeto) {
        Swal.fire({
          icon: 'error',
          title: 'Validación de Pesos',
          text: 'El peso bruto no puede ser menor que el peso neto.',
        });
        return;
      }

      if (editData.pesoNeto > editData.pesoBruto) {
        Swal.fire({
          icon: 'error',
          title: 'Validación de Pesos',
          text: 'El peso neto no puede ser mayor que el peso bruto.',
        });
        return;
      }

      if (editData.pesoBruto === editData.pesoNeto) {
        Swal.fire({
          icon: 'warning',
          title: 'Validación de Pesos Idénticos',
          text: 'El peso bruto y el peso neto no deben ser iguales.',
        });
        return;
      }
    }

    // Confirmar cambios con SweetAlert
    Swal.fire({
      title: '¿Estás seguro?',
      text: '¿Seguro que quieres confirmar los cambios?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, confirmar cambios'
    }).then((result) => {
      if (result.isConfirmed && selectedRow) {
        // Procede a enviar la solicitud de edición
        axios.put(`http://172.16.10.31/api/RfidLabel/${selectedRow.trazabilidad}`, editData)
          .then(response => {
            Swal.fire(
              'Actualizado!',
              'La etiqueta ha sido actualizada.',
              'success'
            );
            // Actualiza los datos de la fila en la tabla
            setRows(rows.map(r => (r.trazabilidad === selectedRow.trazabilidad ? { ...r, ...editData } : r)));
            setOpenEditModal(false);
          })
          .catch(error => {
            Swal.fire(
              'Error!',
              'Hubo un problema al actualizar la etiqueta.',
              'error'
            );
            console.error('Error al actualizar la etiqueta:', error);
          });
      }
    });
  };

  const handleCloseEditModal = () => {
    setOpenEditModal(false);
  };

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 100 },
    { field: 'area', headerName: 'Área', width: 150 },
    { field: 'fecha', headerName: 'Fecha', width: 150 },
    { field: 'claveProducto', headerName: 'Clave Producto', width: 120 },
    { field: 'nombreProducto', headerName: 'Nombre Producto', width: 200 },
    { field: 'turno', headerName: 'Turno', width: 100 },
    { field: 'operador', headerName: 'Operador', width: 150 },
    { field: 'pesoTarima', headerName: 'Peso Tarima', type: 'number', width: 130 },
    { field: 'pesoBruto', headerName: 'Peso Bruto', type: 'number', width: 130 },
    { field: 'pesoNeto', headerName: 'Peso Neto', type: 'number', width: 130 },
    { field: 'piezas', headerName: 'Piezas', type: 'number', width: 100 },
    { field: 'trazabilidad', headerName: 'Trazabilidad', width: 150 },
    { field: 'orden', headerName: 'Orden', width: 120 },
    { field: 'rfid', headerName: 'RFID', width: 150 },
    { field: 'status', headerName: 'Estado', width: 100 },
    { field: 'uom', headerName: 'UOM', width: 100 },
    {
      field: 'acciones',
      headerName: 'Acciones',
      sortable: false,
      filterable: false,
      width: 250,
      renderCell: (params) => (
        <>
          <IconButton onClick={() => handlePreviewClick(params.row)}>
            <VisibilityIcon />
          </IconButton>
          <IconButton onClick={() => handlePrintClick(params.row)}>
            <PrintIcon />
          </IconButton>
          <IconButton onClick={() => handleGeneratePDFClick(params.row)}>
            <ArticleIcon />
          </IconButton>
          <IconButton onClick={() => handleDeleteClick(params.row)}>
            <DeleteIcon />
          </IconButton>
        </>
      ),
    },
  ];

  return (
    <div className='catalogo-bfx'>
      <IconButton onClick={() => navigate('/catalogos')} sx={{ position: 'absolute', top: 16, left: 16 }}>
        <ArrowBackIcon sx={{ fontSize: 40, color: '#46707e' }} />
      </IconButton>
      <Typography variant="h4" sx={{ textAlign: 'center', mt: 4, mb: 4 }}>
        CATALOGO ETIQUETADO BIOFLEX
      </Typography>
      <div className="data-grid-container">
        <DataGrid
          columns={columns}
          disableColumnFilter
          disableColumnSelector
          disableDensitySelector
          slots={{ toolbar: GridToolbar }}
          slotProps={{ toolbar: { showQuickFilter: true } }}
          rows={rows}
          initialState={{
            pagination: {
              paginationModel: {
                pageSize: 25,
              },
            },
          }}
          pageSizeOptions={[5, 10, 25, 50, 100]}
          pagination
          className="MuiDataGrid-root"
        />
      </div>
      <Modal open={openModal} onClose={handleCloseModal}>
        <Paper className="bfx-modal-content">
          <Box className="bfx-modal-header">
            <Typography variant="h6">Vista Previa de la Etiqueta</Typography>
            <IconButton onClick={handleCloseModal}>
              <CloseIcon />
            </IconButton>
          </Box>
          {selectedRow && (
            <Box className="bfx-modal-body">
              <div className="row">
                <Typography><strong>Área:</strong></Typography>
                <Typography>{selectedRow.area}</Typography>
              </div>
              <div className="row">
                <Typography><strong>Fecha:</strong></Typography>
                <Typography>{selectedRow.fecha}</Typography>
              </div>
              <div className="row">
                <Typography><strong>Producto:</strong></Typography>
                <Typography>{selectedRow.nombreProducto}</Typography>
              </div>
              <div className="row">
                <Typography><strong>Orden:</strong></Typography>
                <Typography>{selectedRow.orden}</Typography>
              </div>
              <div className="row">
                <Typography><strong>Turno:</strong></Typography>
                <Typography>{selectedRow.turno}</Typography>
              </div>
              <div className="row">
                <Typography><strong>Peso Bruto:</strong></Typography>
                <Typography>{selectedRow.pesoBruto}</Typography>
              </div>
              <div className="row">
                <Typography><strong>Peso Neto:</strong></Typography>
                <Typography>{selectedRow.pesoNeto}</Typography>
              </div>
              <div className="row">
                <Typography><strong>Peso Tarima:</strong></Typography>
                <Typography>{selectedRow.pesoTarima}</Typography>
              </div>
              <div className="row">
                <Typography><strong># Piezas (Rollos, Bultos, Cajas):</strong></Typography>
                <Typography>{selectedRow.piezas}</Typography>
              </div>
              <div className="row">
                <Typography><strong>Código de Trazabilidad:</strong></Typography>
                <Typography>{selectedRow.trazabilidad}</Typography>
              </div>
              <div className="row">
                <Typography><strong>RFID:</strong></Typography>
                <Typography>{selectedRow.rfid}</Typography>
              </div>
            </Box>
          )}
        </Paper>
      </Modal>

      <Modal open={openEditModal} onClose={handleCloseEditModal} style={{ zIndex: 1050 }}>
        <Paper className="bfx-modal-content">
          <Box className="bfx-modal-header">
            <Typography variant="h6">Editar Datos de la Etiqueta</Typography>
            <IconButton onClick={handleCloseEditModal}>
              <CloseIcon />
            </IconButton>
          </Box>
          <Box className="bfx-modal-body">
            <TextField
              label="Peso Tarima"
              type="number"
              value={editData.pesoTarima}
              onChange={(e) => setEditData({ ...editData, pesoTarima: parseFloat(e.target.value) })}
              fullWidth
              margin="normal"
            />
            <TextField
              label="Peso Bruto"
              type="number"
              value={editData.pesoBruto}
              onChange={(e) => setEditData({ ...editData, pesoBruto: parseFloat(e.target.value) })}
              fullWidth
              margin="normal"
            />
            <TextField
              label="Peso Neto"
              type="number"
              value={editData.pesoNeto}
              onChange={(e) => setEditData({ ...editData, pesoNeto: parseFloat(e.target.value) })}
              fullWidth
              margin="normal"
            />
            <TextField
              label="Piezas"
              type="number"
              value={editData.piezas}
              onChange={(e) => setEditData({ ...editData, piezas: parseFloat(e.target.value) })}
              fullWidth
              margin="normal"
            />
          </Box>
          <Box className="bfx-modal-footer">
            <Button variant="contained" color="primary" onClick={handleEditSubmit}>
              Confirmar Cambios
            </Button>
          </Box>
        </Paper>
      </Modal>
    </div>
  );
};

export default CatalogoBFX;
