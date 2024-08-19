import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { IconButton, Box, Typography, MenuItem, Select, FormControl, InputLabel, SelectChangeEvent, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  DataGrid,
  GridToolbar,
  GridRowsProp,
  GridColDef,
  GridColumnVisibilityModel,
} from '@mui/x-data-grid';
import './catalogoordenes.scss';

interface Area {
  id: number;
  area: string;
}

interface Orden {
  id: number;
  orden: string;
  claveProducto: string;
  producto: string;
  ultimoProceso: string;
  areaId: number;
}

const columns: GridColDef[] = [
  { field: 'id', headerName: 'ID', width: 100 },
  { field: 'orden', headerName: 'Orden', width: 150 },
  { field: 'claveProducto', headerName: 'Clave del Producto', width: 200 },
  { field: 'producto', headerName: 'Producto', width: 500 },
  { field: 'ultimoProceso', headerName: 'Último Proceso', width: 200 }
];

const CatalogoOrdenes: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<GridRowsProp>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [selectedArea, setSelectedArea] = useState<number | string>('');
  const [columnVisibilityModel, setColumnVisibilityModel] = useState<GridColumnVisibilityModel>({});

  useEffect(() => {
    axios.get('http://172.16.10.31/api/Area')
      .then((response) => {
        setAreas(response.data);
      })
      .catch((error) => {
        console.error('Error fetching areas:', error);
      });
  }, []);

  useEffect(() => {
    if (selectedArea) {
      const areaName = areas.find(a => a.id === selectedArea)?.area;
      if (areaName) {
        axios.get<Orden[]>(`http://172.16.10.31/api/Order/${areaName}`)
          .then(response => {
            setOrdenes(response.data);
          })
          .catch(error => {
            console.error('Error fetching orders:', error);
            setOrdenes([]);
          });
      }
    } else {
      setOrdenes([]);
    }
  }, [selectedArea, areas]);

  const handleAreaChange = (event: SelectChangeEvent<number | string>) => {
    setSelectedArea(event.target.value as number);
  };

  return (
    <div className='catalogo-ordenes'>
      <IconButton
        onClick={() => navigate('/catalogos')}
        sx={{
          position: 'absolute',
          top: 16,
          left: 16,
        }}
      >
        <ArrowBackIcon sx={{ fontSize: 40, color: '#46707e' }} />
      </IconButton>
      <Box sx={{ width: '100%', textAlign: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ textAlign: 'center', mt: 4, mb: 4 }}>
          Catálogo de Órdenes
        </Typography>
      </Box>
      <Box sx={{ width: '100%', textAlign: 'center', mb: 4 }} className="select-container">
        <Box className="select-box" sx={{ p: 2, borderRadius: 1, boxShadow: 3, bgcolor: 'background.paper' }}>
          <FormControl variant="outlined" sx={{ minWidth: 200, mb: 2 }}>
            <InputLabel id="select-area-label">Área</InputLabel>
            <Select
              labelId="select-area-label"
              id="select-area"
              value={selectedArea}
              onChange={handleAreaChange}
              label="Área"
            >
              {areas.map((area) => (
                <MenuItem key={area.id} value={area.id}>
                  {area.area}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="contained" sx={{ ml: 2, mt: 2 }}>
            Buscar
          </Button>
        </Box>
      </Box>
      <Box sx={{ width: '100%', textAlign: 'center', mb: 4 }}>
        <DataGrid
          columns={columns}
          rows={ordenes}
          disableColumnFilter
          disableDensitySelector
          disableColumnSelector
          slots={{ toolbar: GridToolbar }}
          slotProps={{ toolbar: { showQuickFilter: true } }}
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={(newModel) => setColumnVisibilityModel(newModel)}
          initialState={{
            pagination: {
              paginationModel: {
                pageSize: 10,
              },
            },
          }}
          pageSizeOptions={[5,10,25,50,100]}
        />
      </Box>
    </div>
  );
};

export default CatalogoOrdenes;

