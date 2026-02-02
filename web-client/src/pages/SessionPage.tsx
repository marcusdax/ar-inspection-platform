import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const SessionPage: React.FC = () => {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [isJoining, setIsJoining] = useState(false);

  if (!user) {
    return <div>Authentication required</div>;
  }

  const handleJoinSession = async () => {
    setIsJoining(true);
    try {
      // In Phase 2, this will be replaced with actual WebRTC connection
      console.log('Joining session:', id);
      // Mock implementation
      setTimeout(() => {
        setIsJoining(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to join session:', error);
      setIsJoining(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Session {id}
      </Typography>
      
      <Paper sx={{ p: 3, textAlign: 'center', mt: 3 }}>
        <Typography variant="body1" gutterBottom>
          Ready to start inspection session
        </Typography>
        
        <Button
          variant="contained"
          size="large"
          onClick={handleJoinSession}
          disabled={isJoining}
          sx={{ mt: 2 }}
        >
          {isJoining ? 'Joining Session...' : 'Join Session'}
        </Button>
      </Paper>
    </Container>
  );
};

export default SessionPage;