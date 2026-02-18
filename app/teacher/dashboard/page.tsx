'use client';

import { Wifi, MonitorSpeaker, Zap, Bot, CheckCircle, Send, Star, Lock, Monitor, Eye, EyeOff, Unlock, Home, Settings, LogOut, Bell, BellOff, Ticket } from 'lucide-react';
import { useState, useEffect } from 'react';
import { db, messaging } from '../../../lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, onSnapshot, query, orderBy, getDoc, setDoc, arrayUnion } from 'firebase/firestore';
import { getToken } from 'firebase/messaging';

async function hashPassword(password: string) {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// The SHA-256 hash for 'admin123'
const DEFAULT_HASH = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';

interface Ticket {
  id: string;
  type: string;
  description?: string;
  status: string;
  className: string;
  createdAt: any;
  evaluation?: any;
  resolvedAt?: any;
  sector?: string;
  floor?: string;
  room?: string;
  machine?: string;
}

const ITDashboardView = ({ onLogout, globalAdminHash }: { onLogout: () => void, globalAdminHash: string }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDescription, setSelectedDescription] = useState<string | null>(null);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tickets' | 'settings'>('tickets');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [notifStatus, setNotifStatus] = useState<NotificationPermission | 'unknown'>('unknown');

  useEffect(() => {
    let isInitialLoad = true;
    const q = query(collection(db, 'tickets'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!isInitialLoad) {
        const hasNewTicket = snapshot.docChanges().some(change => change.type === 'added');
        if (hasNewTicket) {
          try {
            const audio = new Audio('/notify-sound.mp3');
            audio.play().catch(e => console.log('Audio play blocked:', e));
            if ('vibrate' in navigator) { navigator.vibrate([200, 100, 200]); }
          } catch (e) { console.error('Notification error', e); }
        }
      }
      
      const ticketsData: Ticket[] = [];
      snapshot.forEach((doc) => {
        ticketsData.push({
          id: doc.id,
          ...doc.data() as Omit<Ticket, 'id'>
        });
      });
      setTickets(ticketsData);
      setLoading(false);
      isInitialLoad = false;
    }, (error) => {
      console.error('Error fetching tickets:', error);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  const isToday = (date: any) => {
    if (!date) return false;
    const d = date.toDate ? date.toDate() : new Date(date);
    const today = new Date();
    return d.getDate() === today.getDate() && 
           d.getMonth() === today.getMonth() && 
           d.getFullYear() === today.getFullYear();
  };

  const todaysTickets = tickets.filter(t => isToday(t.createdAt));

  const todaysTotalTickets = todaysTickets.length;
  const todaysPendingTickets = todaysTickets.filter(ticket => ticket.status === 'Pendente').length;
  const todaysResolvedTickets = todaysTickets.filter(ticket => ticket.status === 'Resolvido').length;

  const handleDeleteTicket = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este chamado?')) {
      await deleteDoc(doc(db, 'tickets', id));
    }
  };

  const handleForceResolve = async (id: string) => {
    if (confirm('Forçar o encerramento deste chamado?')) {
      await updateDoc(doc(db, 'tickets', id), { status: 'Resolvido', resolvedAt: serverTimestamp() });
    }
  };

  const handleViewDetails = (description: string | undefined) => {
    if (description) {
      setSelectedDescription(description);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifStatus(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        try {
          const token = await getToken(messaging!, {
            vapidKey: 'BNKC-3uFu2xTdDRjMl38VoEiw5rB1y0OGgIPk6x26QDNiU43XCubB59DPmAjhaFLCs501xALp6EhAmZ3Bire94o'
          });
          console.log('FCM Token:', token);
          setFcmToken(token);
          // Save token to Firestore for notifications
          await setDoc(doc(db, 'settings', 'notifications'), {
            tokens: arrayUnion(token)
          }, { merge: true });
        } catch (err) { 
          console.error('Error getting FCM token:', err);
        }
      } else {
        const permission = await Notification.requestPermission();
        setNotifStatus(permission);
        if (permission === 'granted') {
          try {
            const token = await getToken(messaging!, {
              vapidKey: 'BNKC-3uFu2xTdDRjMl38VoEiw5rB1y0OGgIPk6x26QDNiU43XCubB59DPmAjhaFLCs501xALp6EhAmZ3Bire94o'
            });
            console.log('FCM Token:', token);
            setFcmToken(token);
            // Save token to Firestore for notifications
            await setDoc(doc(db, 'settings', 'notifications'), {
              tokens: arrayUnion(token)
            }, { merge: true });
          } catch (err) {
            console.error('Error getting FCM token:', err);
          }
        }
      }
    }
  };

  const handleChangePassword = async () => {
    if(!newAdminPassword) return;
    try {
      const newHash = await hashPassword(newAdminPassword);
      await setDoc(doc(db, 'settings', 'admin'), { passwordHash: newHash }, { merge: true });
      // In a real scenario, we'd update parent state here, but since this is a prop
      // the parent would handle the update
      alert('Senha global alterada com sucesso!');
      setNewAdminPassword('');
    } catch (error) {
      console.error('Error changing password:', error);
      alert('Erro ao alterar senha global.');
    }
  };

  const navItems = [
    { id: 'tickets', label: 'Tickets Rápidos', icon: Home },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-gray-100 overflow-hidden text-sm">
      {/* Sidebar */}
      <div className="hidden md:flex w-64 bg-slate-900 text-white flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold">SchoolIT Admin</h1>
        </div>
        
        <div className="flex-1 flex flex-col">
          <nav className="flex-1 px-4 py-6">
            {navItems.map((item) => (
              <a 
                key={item.id}
                href="#"
                className={`flex items-center px-4 py-3 rounded-lg mb-2 ${
                  activeTab === item.id 
                    ? 'bg-slate-800 text-white' 
                    : 'text-slate-400 hover:bg-slate-800'
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab(item.id as 'tickets' | 'settings');
                }}
              >
                <item.icon size={20} className="mr-3" />
                <span>{item.label}</span>
              </a>
            ))}
          </nav>
          
          <div className="px-4 pb-6">
            <button 
              onClick={onLogout}
              className="flex items-center w-full px-4 py-3 text-slate-400 hover:bg-slate-800 rounded-lg"
            >
              <LogOut size={20} className="mr-3" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col overflow-y-auto w-full">
        {/* Mobile Top-bar */}
        <div className="md:hidden flex-none flex flex-col bg-slate-900 text-white w-full shadow-md z-10">
          {/* Top Bar */}
          <div className="flex items-center justify-between p-4">
            <span className="font-bold">SchoolIT Admin</span>
            <button onClick={onLogout} className="text-sm bg-slate-800 px-3 py-1 rounded hover:bg-slate-700">Sair</button>
          </div>

          {/* Mobile Tabs */}
          <div className="flex border-t border-slate-700">
            <button 
              onClick={() => setActiveTab('tickets')} 
              className={`flex-1 py-3 text-sm flex justify-center items-center gap-2 transition-colors ${activeTab === 'tickets' ? 'bg-slate-800 border-b-2 border-blue-500 text-white' : 'text-slate-400'}`}
            >
              <Ticket size={16} /> Tickets
            </button>
            <button 
              onClick={() => setActiveTab('settings')} 
              className={`flex-1 py-3 text-sm flex justify-center items-center gap-2 transition-colors ${activeTab === 'settings' ? 'bg-slate-800 border-b-2 border-blue-500 text-white' : 'text-slate-400'}`}
            >
              <Settings size={16} /> Configs
            </button>
          </div>
        </div>
        
        {/* Main Content */}
        {/* Top Header */}
        <div className="bg-white border-b p-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">{activeTab === 'tickets' ? 'Visão Geral' : 'Configurações'}</h2>
          </div>
        </div>
        
        {activeTab === 'tickets' && (
          <>
            {/* Stats Row */}
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white shadow-sm rounded-xl p-4">
                  <h3 className="text-gray-500 text-sm">Total de Chamados</h3>
                  <p className="text-2xl font-bold">{todaysTotalTickets}</p>
                </div>
                
                <div className="bg-white shadow-sm rounded-xl p-4">
                  <h3 className="text-gray-500 text-sm">Pendentes</h3>
                  <p className="text-2xl font-bold text-red-600">{todaysPendingTickets}</p>
                </div>
                
                <div className="bg-white shadow-sm rounded-xl p-4">
                  <h3 className="text-gray-500 text-sm">Resolvidos</h3>
                  <p className="text-2xl font-bold text-green-600">{todaysResolvedTickets}</p>
                </div>
              </div>
            </div>
            
            {/* Data Table/List */}
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="bg-white rounded-xl shadow-sm">
                <table className="w-full">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">Local / Máquina</th>
                      <th className="text-left py-3 px-4">Problema</th>
                      <th className="text-left py-3 px-4">Horário</th>
                      <th className="text-left py-3 px-4">Avaliação</th>
                      <th className="text-left py-3 px-4">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="text-center py-4 px-4">Carregando...</td>
                      </tr>
                    ) : tickets.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-4 px-4">Nenhum chamado encontrado</td>
                      </tr>
                    ) : (
                      tickets.map(ticket => {
                        const createdAt = ticket.createdAt?.toDate ? ticket.createdAt.toDate() : new Date();
                        const formattedTime = createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const formattedDate = createdAt.toLocaleDateString();
                        
                        return (
                          <tr key={ticket.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                ticket.status === 'Pendente' 
                                  ? 'bg-red-100 text-red-700' 
                                  : 'bg-green-100 text-green-700'
                              }`}>
                                {ticket.status}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-semibold">{ticket.room || ticket.className || '-'} ({ticket.floor})</div>
                              <div className="text-xs text-gray-500">{ticket.sector} | {ticket.machine}</div>
                            </td>
                            <td className="py-3 px-4">{ticket.type}{ticket.description && (
                              <button onClick={() => handleViewDetails(ticket.description)} className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200">Ver Detalhes</button>
                            )}</td>
                            <td className="py-3 px-4">
                              <div>{formattedTime}</div>
                              <div className="text-gray-500 text-xs">{formattedDate}</div>
                            </td>
                            <td className="py-3 px-4">
                              {ticket.status === 'Resolvido' ? (
                                ticket.evaluation ? (
                                  <div className="flex items-center">
                                    <Star size={16} className="text-yellow-400 mr-1" />
                                    <span className="text-xs">
                                      {(Object.values<number>(ticket.evaluation).reduce((a: number, b: number) => a + b, 0) / Object.values<number>(ticket.evaluation).length).toFixed(1)}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-gray-400 italic">S/N</span>
                                )
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                {ticket.status === 'Pendente' && (
                                  <button onClick={() => handleForceResolve(ticket.id)} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200">Forçar Baixa</button>
                                )}
                                <button onClick={() => handleDeleteTicket(ticket.id)} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200">Excluir</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
        
        {activeTab === 'settings' && (
          <div className="p-4">
            <div className="bg-white p-6 rounded-xl shadow-sm max-w-md mx-auto">
              <h2 className="text-lg font-semibold mb-4">Alterar Senha Global do Sistema</h2>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="adminPassword">
                  Nova Senha
                </label>
                <input
                  id="adminPassword"
                  type="password"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Digite a nova senha"
                />
              </div>
              
              <button 
                onClick={handleChangePassword}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Salvar Nova Senha
              </button>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm max-w-md mx-auto mt-6">
              <h3 className="text-lg font-bold mb-2">Notificações do Sistema</h3>
              <p className="text-gray-600 text-sm mb-4">Receba alertas visuais e sonoros quando um novo chamado for aberto, mesmo com o painel em segundo plano.</p>

              {notifStatus === 'granted' && (
                <div className="flex items-center gap-2 text-green-600 font-medium bg-green-50 p-3 rounded-lg border border-green-100">
                  <Bell size={20} />
                  <span>Notificações Ativadas</span>
                </div>
              )}

              {(notifStatus === 'default' || notifStatus === 'unknown') && (
                <button onClick={requestNotificationPermission} className="w-full flex justify-center items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  <Bell size={20} />
                  <span>Ativar Notificações</span>
                </button>
              )}

              {notifStatus === 'denied' && (
                <div className="flex items-center gap-2 text-red-600 font-medium bg-red-50 p-3 rounded-lg border border-red-100">
                  <BellOff size={20} />
                  <span>Bloqueado pelo Navegador</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Description Modal */}
      {selectedDescription !== null && (
        <div className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Detalhes do Problema</h3>
            <p className="text-gray-700 mb-6">{selectedDescription}</p>
            <button 
              onClick={() => setSelectedDescription(null)}
              className="w-full bg-blue-600 text-white rounded-xl py-3 hover:bg-blue-700 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const TeacherDashboardPage = () => {
  const [globalAdminHash, setGlobalAdminHash] = useState<string>(DEFAULT_HASH);
  
  useEffect(() => {
    const fetchAdminHash = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'admin'));
        if (docSnap.exists() && docSnap.data().passwordHash) {
          setGlobalAdminHash(docSnap.data().passwordHash);
        }
      } catch (e) { console.error('Error fetching admin hash', e); }
    };
    fetchAdminHash();
  }, []);
  
  const [deviceRole, setDeviceRole] = useState<'loading' | 'setup' | 'teacher' | 'it'>('loading');
  const [setupPassword, setSetupPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSetupAuthenticated, setIsSetupAuthenticated] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [quickDescription, setQuickDescription] = useState('');
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);
  const [className, setClassName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [ratings, setRatings] = useState({ speed: 0, cordiality: 0, resolution: 0 });
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [isRegisteringDevice, setIsRegisteringDevice] = useState(false);
  const [deviceData, setDeviceData] = useState({ sector: 'Sala de Aula', floor: 'Térreo', room: '', machine: '' });

  useEffect(() => {
    const role = localStorage.getItem('schoolit_role');
    setDeviceRole(role ? (role as any) : 'setup');
  }, []);

  const handleResetForm = () => {
    setIsSuccess(false);
    setSelectedIssue(null);
    setQuickDescription('');
    setClassName('');
  };

  const handleSubmitEvaluation = async () => {
    if (!ticketId) {
      // If no ticket ID, just reset UI
      setIsSuccess(false);
      setIsEvaluating(false);
      setClassName('');
      setQuickDescription('');
      setRatings({ speed: 0, cordiality: 0, resolution: 0 });
      setSelectedIssue(null);
      return;
    }
    
    try {
      await updateDoc(doc(db, 'tickets', ticketId), {
        evaluation: ratings
      });
      
      // Reset all states to return to initial dashboard
      setIsSuccess(false);
      setIsEvaluating(false);
      setClassName('');
      setQuickDescription('');
      setRatings({ speed: 0, cordiality: 0, resolution: 0 });
      setSelectedIssue(null);
      setTicketId(null);
    } catch (error) {
      console.error('Erro ao enviar avaliação:', error);
      alert('Erro ao enviar avaliação. Por favor, tente novamente.');
    }
  };

  const handleStarClick = (category: 'speed' | 'cordiality' | 'resolution', rating: number) => {
    setRatings(prev => ({
      ...prev,
      [category]: rating
    }));
  };
  
  const getDeviceInfo = () => JSON.parse(localStorage.getItem('schoolit_device') || '{}');
  
  const handleQuickAction = async (issueType: string) => {
    const device = getDeviceInfo();
    try {
      const docRef = await addDoc(collection(db, 'tickets'), {
        type: issueType,
        sector: device.sector || '',
        floor: device.floor || '',
        room: device.room || 'Desconhecida',
        machine: device.machine || '',
        status: 'Pendente',
        createdAt: serverTimestamp()
      });
      setTicketId(docRef.id);
      setIsSuccess(true);
      
      // Trigger push notification
      fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Novo Chamado de TI',
          body: `Problema: ${issueType} | Local: ${device.room || 'Não identificado'}`
        })
      }).catch(e => console.error('Push notification failed:', e));
    } catch (e) { 
      console.error(e); 
    }
  };

  const quickActions = [
    { 
      icon: Wifi, 
      label: 'Sem Internet', 
    },
    { 
      icon: MonitorSpeaker, 
      label: 'Projetor/Som', 
    },
    { 
      icon: Zap, 
      label: 'Falta Cabo/Energia', 
    },
    { 
      icon: Bot, 
      label: 'Ajuda da IA', 
    },
  ];

  const recentTickets = [
    { id: 1, title: 'Problema no Projetor', status: 'Pendente', color: 'bg-red-500' },
    { id: 2, title: 'Wi-Fi Lento', status: 'Resolvido', color: 'bg-green-500' },
    { id: 3, title: 'Falta de Cabo HDMI', status: 'Pendente', color: 'bg-red-500' },
  ];

  return (
    <>
      {deviceRole === 'loading' && null}
      
      {deviceRole === 'setup' && (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center p-6">
          <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Configuração do Dispositivo</h2>
            
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="setupPassword">
                Senha de Configuração
              </label>
              <div className="relative">
                <input
                  id="setupPassword"
                  type={showPassword ? "text" : "password"}
                  value={setupPassword}
                  onChange={(e) => setSetupPassword(e.target.value)}
                  onKeyDown={async (e) => { 
                    if (e.key === 'Enter' && setupPassword) {
                      const inputHash = await hashPassword(setupPassword);
                      if (inputHash === globalAdminHash) {
                        setIsSetupAuthenticated(true);
                      } else {
                        alert('Senha incorreta!');
                      }
                    }
                  }}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                  placeholder="Digite a senha de configuração"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            
            {!isSetupAuthenticated ? (
              <button 
                onClick={async () => {
                  if (setupPassword) {
                    const inputHash = await hashPassword(setupPassword);
                    if (inputHash === globalAdminHash) {
                      setIsSetupAuthenticated(true);
                    } else {
                      alert('Senha incorreta!');
                    }
                  }
                }}
                className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors w-full"
              >
                Validar Senha
              </button>
            ) : isRegisteringDevice ? (
              <div className="bg-white p-6 rounded-2xl shadow-lg w-full">
                <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">Registrar Dispositivo (Ativo)</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="sector">
                      Setor
                    </label>
                    <select
                      id="sector"
                      value={deviceData.sector}
                      onChange={(e) => setDeviceData({...deviceData, sector: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="Sala de Aula">Sala de Aula</option>
                      <option value="Gestão">Gestão</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="floor">
                      Andar
                    </label>
                    <select
                      id="floor"
                      value={deviceData.floor}
                      onChange={(e) => setDeviceData({...deviceData, floor: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="Térreo">Térreo</option>
                      <option value="1º Andar">1º Andar</option>
                      <option value="2º Andar">2º Andar</option>
                      <option value="3º Andar">3º Andar</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="room">
                      Identificação/Sala
                    </label>
                    <input
                      id="room"
                      type="text"
                      value={deviceData.room}
                      onChange={(e) => setDeviceData({...deviceData, room: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ex: Sala 12A ou Diretoria"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="machine">
                      Máquina
                    </label>
                    <input
                      id="machine"
                      type="text"
                      value={deviceData.machine}
                      onChange={(e) => setDeviceData({...deviceData, machine: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ex: Notebook Dell Inspiron"
                    />
                  </div>
                  
                  <div className="flex flex-col space-y-3 pt-4">
                    <button 
                      onClick={() => {
                        localStorage.setItem('schoolit_device', JSON.stringify(deviceData));
                        localStorage.setItem('schoolit_role', 'teacher');
                        setDeviceRole('teacher');
                      }}
                      className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Finalizar Cadastro
                    </button>
                    
                    <button 
                      onClick={() => setIsRegisteringDevice(false)}
                      className="px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Voltar
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col space-y-3">
                <button 
                  onClick={() => setIsRegisteringDevice(true)}
                  className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Configurar como Sala de Aula
                </button>
                
                <button 
                  onClick={() => {
                    localStorage.setItem('schoolit_role', 'it');
                    setDeviceRole('it');
                  }}
                  className="px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Configurar como Painel TI
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {deviceRole === 'it' && (
        <ITDashboardView 
          onLogout={() => { 
            localStorage.removeItem('schoolit_role'); 
            setDeviceRole('setup'); 
          }} 
          globalAdminHash={globalAdminHash}
        />
      )}
      
      {deviceRole === 'teacher' && (
        <div className="min-h-screen bg-gray-50">
          {/* Fixed Header */}
          <div className="w-full bg-blue-900 text-white p-4 relative">
            <div className="max-w-4xl mx-auto px-6 flex justify-between items-center">
              <div>
                <h1 className="text-lg font-semibold">
                  Olá, {deviceData.sector == 'Sala de Aula' ? 'Prof. ' : ''}<span className="font-bold">Qual Seu Problema?</span>
                </h1>
                <p className="text-sm opacity-80">Sala: {getDeviceInfo().room || 'Não identificada'}</p>
              </div>
              <div 
                className="group flex items-center cursor-pointer overflow-hidden transition-all duration-300 ease-in-out w-5 hover:w-[150px] text-white/80 hover:text-white"
                onClick={() => setShowResetModal(true)}
              >
                <div className="shrink-0 flex items-center">
                  <Lock size={18} className="group-hover:hidden" />
                  <Unlock size={18} className="hidden group-hover:block" />
                </div>
                <span className="ml-2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-sm">Desbloquear setup</span>
              </div>
            </div>
          </div>
          
          {showResetModal && (
            <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center">
              <div className="bg-white p-6 rounded-2xl w-full max-w-sm">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Autorização Necessária</h3>
                
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="resetPassword">
                    Senha de Configuração
                  </label>
                  <div className="relative">
                    <input
                      id="resetPassword"
                      type={showResetPassword ? "text" : "password"}
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter' && resetPassword) {
                          const inputHash = await hashPassword(resetPassword);
                          if (inputHash === globalAdminHash) {
                            localStorage.removeItem('schoolit_role'); 
                            setDeviceRole('setup'); 
                            setShowResetModal(false); 
                            setResetPassword('');
                            setIsSetupAuthenticated(false);
                            setSetupPassword('');
                          } else {
                            alert('Senha incorreta!');
                          }
                        }
                      }}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                      placeholder="Digite a senha de configuração"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowResetPassword(!showResetPassword)}
                    >
                      {showResetPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button 
                    onClick={() => setShowResetModal(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={async () => {
                      if (resetPassword) {
                        const inputHash = await hashPassword(resetPassword);
                        if (inputHash === globalAdminHash) {
                          localStorage.removeItem('schoolit_role'); 
                          setDeviceRole('setup'); 
                          setShowResetModal(false); 
                          setResetPassword('');
                          setIsSetupAuthenticated(false);
                          setSetupPassword('');
                        } else {
                          alert('Senha incorreta!');
                          setResetPassword('');
                        }
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Desbloquear
                  </button>
                </div>
              </div>
            </div>
          )}
          
          <div className="max-w-4xl mx-auto p-4 pt-6">
            {/* Quick Description Field */}
            <div className="mb-8">
              <div className="relative w-full">
                <textarea
                  value={quickDescription}
                  onChange={(e) => setQuickDescription(e.target.value)}
                  placeholder="Descreva o problema aqui se preferir..."
                  className="w-full min-h-[120px] p-4 pb-14 rounded-lg border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 resize-none"
                />
                <button
                  onClick={async () => {
                    if (!quickDescription.trim()) return;
                    const device = getDeviceInfo();
                    try {
                      const docRef = await addDoc(collection(db, 'tickets'), {
                        type: 'Problema Personalizado',
                        description: quickDescription.trim(),
                        sector: device.sector || '',
                        floor: device.floor || '',
                        room: device.room || 'Desconhecida',
                        machine: device.machine || '',
                        status: 'Pendente',
                        createdAt: serverTimestamp()
                      });
                      setTicketId(docRef.id);
                      setQuickDescription(''); // Clear the input
                      setIsSuccess(true);
                                      
                      // Trigger push notification
                      fetch('/api/notify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          title: 'Novo Chamado de TI',
                          body: `Problema: Problema Personalizado | Local: ${device.room || 'Não identificado'}`
                        })
                      }).catch(e => console.error('Push notification failed:', e));
                    } catch (e) { console.error('Error creating custom ticket:', e); }
                  }}
                  disabled={!quickDescription.trim()}
                  className="absolute bottom-3 left-3 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={16} />
                  Enviar
                </button>
              </div>
            </div>

            {/* Quick Action Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickAction(action.label)}
                  className="bg-white border border-blue-600 rounded-xl p-4 shadow-sm transition-all duration-200 active:scale-95 hover:bg-blue-50 hover:shadow-md flex flex-col items-center justify-center h-24"
                >
                  <action.icon size={24} className="mb-2 text-blue-600" />
                  <span className="text-sm font-medium text-blue-600">{action.label}</span>
                </button>
              ))}
            </div>

            {isSuccess ? (
              !isEvaluating ? (
                <div className="fixed inset-0 z-[100] w-screen h-screen bg-blue-900 flex flex-col items-center justify-center m-0 p-0 overflow-hidden">
                  <CheckCircle size={80} className="text-green-500 mb-6" />
                  <h1 className="text-3xl font-bold text-white mb-2">TI acionado!</h1>
                  <p className="text-xl text-white mb-8">Chegamos em 3 minutos.</p>
                  <button 
                    onClick={async () => {
                      if (ticketId) {
                        await updateDoc(doc(db, 'tickets', ticketId), { status: 'Resolvido', resolvedAt: serverTimestamp() });
                      }
                      setIsEvaluating(true);
                    }}
                    className="mt-8 px-6 py-3 border border-white text-white rounded-xl hover:bg-white/10 transition-colors"
                  >
                    Problema Resolvido (Encerrar)
                  </button>
                </div>
              ) : (
                <div className="fixed inset-0 z-[100] w-screen h-screen bg-blue-900 flex flex-col items-center justify-center m-0 p-0 overflow-hidden">
                  <div className="bg-white rounded-2xl p-8 max-w-md w-full text-gray-900">
                    <h2 className="text-xl font-bold text-center mb-6">Avalie o Atendimento</h2>
                    
                    <div className="mb-6">
                      <p className="mb-3">1. Tempo de resposta?</p>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={24}
                            className={`cursor-pointer ${star <= ratings.speed ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                            onClick={() => handleStarClick('speed', star)}
                          />
                        ))}
                      </div>
                    </div>
                    
                    <div className="mb-6">
                      <p className="mb-3">2. Cordialidade?</p>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={24}
                            className={`cursor-pointer ${star <= ratings.cordiality ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                            onClick={() => handleStarClick('cordiality', star)}
                          />
                        ))}
                      </div>
                    </div>
                    
                    <div className="mb-6">
                      <p className="mb-3">3. Problema resolvido?</p>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={24}
                            className={`cursor-pointer ${star <= ratings.resolution ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                            onClick={() => handleStarClick('resolution', star)}
                          />
                        ))}
                      </div>
                    </div>
                    
                    <button 
                      onClick={handleSubmitEvaluation}
                      className="w-full bg-blue-600 text-white rounded-xl py-3 mt-6 hover:bg-blue-700 transition-colors"
                    >
                      Enviar Avaliação
                    </button>
                  </div>
                </div>
              )
            ) : (
              <div>
                {/* Recent Tickets Section */}
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                  <h2 className="text-md font-semibold text-gray-800 mb-4">Chamados Recentes</h2>
                  <div className="space-y-3">
                    {recentTickets.map((ticket: { id: number; title: string; status: string; color: string }) => (
                      <div key={ticket.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${ticket.color}`}></div>
                          <span className="text-sm text-gray-700">{ticket.title}</span>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          ticket.status === 'Resolvido' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {ticket.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default TeacherDashboardPage;