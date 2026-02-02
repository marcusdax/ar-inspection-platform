import React from 'react';
import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Alert,
} from '@mui/material';
import {
  GridColDef,
  DataGrid,
} from '@mui/x-data-grid';
import { useAuth } from '../contexts/AuthContext';

const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({
    totalSessions: 0,
    completedSessions: 0,
    averageDuration: 0,
    userSatisfaction: 4.5,
  });

  useEffect(() => {
    // Load dashboard stats
    // In a real implementation, this would fetch from API
    const loadStats = async () => {
      try {
        // Mock data for now
        setStats({
          totalSessions: 12,
          completedSessions: 10,
          averageDuration: 45,
          userSatisfaction: 4.5,
        });
      } catch (error) {
        console.error('Failed to load stats:', error);
      }
    };

    loadStats();
  }, []);

  const handleLogout = () => {
    logout();
  };

  const columns: GridColDef[] = [
    {
      field: 'id',
      headerName: 'Session ID',
      width: 150,
    },
    {
      field: 'clientName',
      headerName: 'Client',
      width: 150,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
    },
    {
      field: 'duration',
      headerName: 'Duration (min)',
      width: 120,
    },
    {
      field: 'earnings',
      headerName: 'Earnings',
      width: 120,
      valueFormatter: (value: number) => `$${value.toFixed(2)}`,
    },
  ];

  const sessions = [
    {
      id: '001',
      clientName: 'John Doe',
      status: 'Completed',
      duration: 45,
      earnings: 75.00,
    },
    {
      id: '002',
      clientName: 'Jane Smith',
      status: 'Active',
      duration: 30,
      earnings: 50.00,
    },
    {
      id: '003',
      clientName: 'Bob Johnson',
      status: 'Scheduled',
      duration: 60,
      earnings: 100.00,
    },
  ];

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Dashboard
        </Typography>
        <Box>
          <Typography variant="body2">
            Welcome, {user?.name || 'Expert'}!
          </Typography>
          <Typography variant="body2" color="error.main" sx={{ cursor: 'pointer' }} onClick={handleLogout}>
            Logout
          </Typography>
        </Box>
      </Box>

      {/* Stats Overview */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Overview
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="primary.main">
                {stats.totalSessions}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Sessions
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {stats.completedSessions}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Completed
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="info.main">
                {stats.averageDuration}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Avg Duration (min)
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">
                {stats.userSatisfaction}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                User Satisfaction
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      {/* Recent Sessions */}
      <Paper sx={{ p: 2, height: 400 }}>
        <Typography variant="h6" gutterBottom>
          Recent Sessions
        </Typography>
        <DataGrid
          rows={sessions}
          columns={columns}
          pageSize={5}
          rowsPerPageOptions={[5]}
          disableSelectionOnClick
          sx={{ minHeight: 300 }}
        />
      </Paper>
    </Container>
  );
};

export default DashboardPage;