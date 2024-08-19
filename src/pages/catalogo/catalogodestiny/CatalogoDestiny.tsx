import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { DataGrid, GridToolbar, GridRowsProp, GridColDef } from '@mui/x-data-grid';
import { IconButton, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PrintIcon from '@mui/icons-material/Print';
import DeleteIcon from '@mui/icons-material/Delete';
import Swal from 'sweetalert2';
import './catalogodestiny.scss';

interface RowData {
  id: number;
  area: string;
  fecha: string;
  claveProducto: string;
  nombreProducto: string;
  claveOperador: string;
  operador: string;
  turno: string;
  pesoTarima: number;
  pesoBruto: number;
  pesoNeto: number;
  piezas: number;
  trazabilidad: string;
  orden: string;
  rfid: string;
  status: number;
  uom: string;
  prodEtiquetaRFIDId: number;
  shippingUnits: number;
  inventoryLot: string;
  individualUnits: number;
  palletId: string;
  customerPo: string;
  totalUnits: number;
  productDescription: string;
  itemNumber: string;
}

interface Printer {
  id: number;
  name: string;
  ip: string;
}

const printers: Printer[] = [
  { id: 1, name: 'Impresora 1', ip: '172.16.20.56' },
  { id: 2, name: 'Impresora 2', ip: '172.16.20.57' },
  { id: 3, name: 'Impresora 3', ip: '172.16.20.112' }
];

const CatalogoDestiny: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<GridRowsProp>([]);

  useEffect(() => {
    axios.get('http://172.16.10.31/api/LabelDestiny')
      .then(response => {
        setRows(response.data.map((item: any) => ({
          id: item.id,
          area: item.area,
          fecha: item.fecha,
          claveProducto: item.claveProducto,
          nombreProducto: item.nombreProducto,
          claveOperador: item.claveOperador,
          operador: item.operador,
          turno: item.turno,
          pesoTarima: item.pesoTarima,
          pesoBruto: item.pesoBruto,
          pesoNeto: item.pesoNeto,
          piezas: item.piezas,
          trazabilidad: item.trazabilidad,
          orden: item.orden,
          rfid: item.rfid,
          status: item.status,
          uom: item.uom,
          prodEtiquetaRFIDId: item.prodExtrasDestiny.prodEtiquetaRFIDId,
          shippingUnits: item.prodExtrasDestiny.shippingUnits,
          inventoryLot: item.prodExtrasDestiny.inventoryLot,
          individualUnits: item.prodExtrasDestiny.individualUnits,
          palletId: item.prodExtrasDestiny.palletId,
          customerPo: item.prodExtrasDestiny.customerPo,
          totalUnits: item.prodExtrasDestiny.totalUnits,
          productDescription: item.prodExtrasDestiny.productDescription,
          itemNumber: item.prodExtrasDestiny.itemNumber
        })));
      })
      .catch(error => console.error('Error fetching data:', error));
  }, []);

  const handlePrintClick = (row: RowData) => {
    showPrinterSelection(row);
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
        axios.delete(`http://172.16.10.31/api/LabelDestiny/${row.trazabilidad}`)
          .then(response => {
            Swal.fire(
              'Eliminado!',
              'La etiqueta ha sido eliminada.',
              'success'
            );
            // Remueve la fila eliminada del estado
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

  const showPrinterSelection = (row: RowData) => {
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
      if (result.isConfirmed && result.value) {
        const selectedPrinter = result.value as Printer;
        const postData = {
          area: row.area,
          claveProducto: row.claveProducto,
          nombreProducto: row.nombreProducto,
          claveOperador: row.claveOperador,
          operador: row.operador,
          turno: row.turno,
          pesoTarima: row.pesoTarima,
          pesoBruto: row.pesoBruto,
          pesoNeto: row.pesoNeto,
          piezas: row.piezas,
          trazabilidad: row.trazabilidad,
          orden: row.orden.toString(),
          rfid: row.rfid,
          status: row.status,
          fecha: row.fecha,
          postExtraDestinyDto: {
            shippingUnits: row.shippingUnits,
            uom: row.uom,
            inventoryLot: row.inventoryLot,
            individualUnits: row.individualUnits,
            palletId: row.palletId,
            customerPo: row.customerPo,
            totalUnits: row.totalUnits,
            productDescription: row.productDescription,
            itemNumber: row.itemNumber
          }
        };
  
        axios.post(`http://172.16.10.31/Printer/PrintDestinyLabel?ip=${selectedPrinter.ip}`, postData)
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

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 100 },
    { field: 'prodEtiquetaRFIDId', headerName: 'RFID ID', width: 120 },
    { field: 'shippingUnits', headerName: 'Shipping Units', width: 130 },
    { field: 'uom', headerName: 'UOM', width: 100 },
    { field: 'inventoryLot', headerName: 'Inventory Lot', width: 150 },
    { field: 'individualUnits', headerName: 'Individual Units', width: 130 },
    { field: 'palletId', headerName: 'Pallet ID', width: 130 },
    { field: 'customerPo', headerName: 'Customer PO', width: 130 },
    { field: 'totalUnits', headerName: 'Total Units', width: 120 },
    { field: 'productDescription', headerName: 'Product Description', width: 200 },
    { field: 'itemNumber', headerName: 'Item Number', width: 120 },
    {
      field: 'acciones',
      headerName: 'Acciones',
      sortable: false,
      filterable: false,
      width: 150,
      renderCell: (params) => (
        <>
          <IconButton onClick={() => handlePrintClick(params.row)}>
            <PrintIcon />
          </IconButton>
          <IconButton onClick={() => handleDeleteClick(params.row)}>
            <DeleteIcon />
          </IconButton>
        </>
      ),
    }
  ];

  return (
    <div className='catalogo-destiny'>
      <IconButton onClick={() => navigate('/catalogos')} className="back-button">
        <ArrowBackIcon sx={{ fontSize: 40, color: '#46707e' }} />
      </IconButton>
      <Typography variant="h4" className="title">
        CATALOGO ETIQUETADO DESTINY
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
          pageSizeOptions={[5,10,25,50,100]}
          pagination
          className="MuiDataGrid-root"
        />
      </div>
    </div>
  );
};

export default CatalogoDestiny;
