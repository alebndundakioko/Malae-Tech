import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, orderBy, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Trash2, 
  Calendar, 
  ChevronRight, 
  Search,
  Plus,
  Clock,
  User as UserIcon,
  Filter,
  MoreVertical,
  ArrowUpRight,
  Activity,
  ArrowUpDown,
  ShieldCheck,
  Sparkles,
  BookOpen,
  Heart
} from 'lucide-react';
import { Loader } from './Loader';

interface DashboardProps {
  onNewReport: () => void;
  onViewReport: (report: any) => void;
  onConfirmDelete: (onConfirm: () => void) => void;
}

const getInitials = (name: string) => {
  if (!name) return 'N/A';
  return name.split(' ').map(n => n[0]).join('.').toUpperCase();
};

export const Dashboard = ({ onNewReport, onViewReport, onConfirmDelete }: DashboardProps) => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'original' | 'story'>('all');
  const [sortBy, setSortBy] = useState<'date-newest' | 'date-oldest' | 'type-story' | 'type-original'>('date-newest');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    if (!auth.currentUser) return;
    
    setLoading(true);
    const path = 'reports';
    try {
      const q = query(
        collection(db, 'reports'),
        where('userId', '==', auth.currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const fetchedReports = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setReports(fetchedReports);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    } finally {
      // Small delay for a smoother "human" feel
      setTimeout(() => setLoading(false), 600);
    }
  };

  const handleDelete = async (e: React.MouseEvent, reportId: string) => {
    e.stopPropagation();
    
    onConfirmDelete(async () => {
      const path = `reports/${reportId}`;
      try {
        await deleteDoc(doc(db, 'reports', reportId));
        setReports(reports.filter(r => r.id !== reportId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    });
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.patientData?.fullName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || report.type === filterType;
    
    return matchesSearch && matchesType;
  });

  const sortedReports = [...filteredReports].sort((a, b) => {
    const dateA = a.createdAt?.seconds || 0;
    const dateB = b.createdAt?.seconds || 0;

    switch (sortBy) {
      case 'date-newest':
        return dateB - dateA;
      case 'date-oldest':
        return dateA - dateB;
      case 'type-story':
        if (a.type === b.type) return dateB - dateA;
        return a.type === 'story' ? -1 : 1;
      case 'type-original':
        if (a.type === b.type) return dateB - dateA;
        return a.type === 'original' ? -1 : 1;
      default:
        return 0;
    }
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="min-h-full bg-[#FAFAFA] selection:bg-[#AE6965]/10">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[10%] -right-[5%] w-[40%] h-[40%] rounded-full bg-[#AE6965]/5 blur-[120px]" />
        <div className="absolute top-[20%] -left-[10%] w-[30%] h-[30%] rounded-full bg-blue-50/50 blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10">
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12 sm:mb-16"
        >
          <div className="space-y-4">
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#AE6965]/10 text-[#AE6965] font-bold text-[10px] uppercase tracking-[0.2em]"
            >
              <Sparkles className="w-3 h-3" />
              Clinical Workspace
            </motion.div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
              {getGreeting()}, <br />
              <span className="text-[#AE6965]">{auth.currentUser?.displayName?.split(' ')[0] || 'Professional'}</span>
            </h1>
            <p className="text-base sm:text-lg text-slate-500 max-w-xl font-medium leading-relaxed">
              Your clinical archive is ready. You have documented <span className="text-slate-900 font-bold">{reports.length} cases</span> so far.
            </p>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-4"
          >
            <button
              onClick={onNewReport}
              className="group relative bg-slate-900 text-white px-8 py-5 rounded-[2rem] font-bold shadow-2xl shadow-slate-200 hover:shadow-slate-300 hover:-translate-y-1 transition-all flex items-center gap-3 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#AE6965] to-[#8E5450] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <Plus className="w-5 h-5 relative z-10" />
              <span className="relative z-10">Start New Case</span>
            </button>
          </motion.div>
        </motion.div>

        {/* Stats Grid - Bento Style */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="md:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col justify-between relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <Activity className="w-32 h-32 text-[#AE6965]" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-8">Clinical Summary</p>
              <div className="flex items-end gap-4 mb-2">
                <span className="text-6xl font-black text-slate-900">{reports.length}</span>
                <span className="text-lg font-bold text-slate-400 mb-2">Total Cases</span>
              </div>
              <div className="flex items-center gap-6 mt-8">
                <div className="flex flex-col">
                  <span className="text-xl font-bold text-slate-900">{reports.filter(r => r.type === 'story').length}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AI Stories</span>
                </div>
                <div className="w-px h-8 bg-slate-100" />
                <div className="flex flex-col">
                  <span className="text-xl font-bold text-slate-900">{reports.filter(r => r.type === 'original').length}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Clinical Records</span>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-[#AE6965] p-8 rounded-[2.5rem] shadow-2xl shadow-[#AE6965]/20 text-white flex flex-col justify-between relative overflow-hidden group"
          >
            <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
            <div>
              <Sparkles className="w-8 h-8 mb-6" />
              <h3 className="text-2xl font-bold mb-2">AI Ready</h3>
              <p className="text-white/70 text-sm leading-relaxed">
                Your clinical data is being synthesized into professional narratives.
              </p>
            </div>
            <button 
              onClick={onNewReport}
              className="mt-8 flex items-center gap-2 text-sm font-bold group/btn"
            >
              Create now
              <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>

        {/* Main Content Area */}
        <div className="space-y-8">
          {/* Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Archive</h2>
              <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
                {(['all', 'original', 'story'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
                      filterType === type 
                        ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' 
                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {type === 'all' ? 'All' : type === 'original' ? 'Clinical' : 'Stories'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative hidden sm:block">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search patient..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-11 pr-4 py-3 rounded-2xl border border-slate-100 bg-white text-sm focus:outline-none focus:ring-4 focus:ring-[#AE6965]/5 focus:border-[#AE6965] transition-all w-64 shadow-sm"
                />
              </div>
              
              <div className="relative">
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="pl-4 pr-10 py-3 rounded-2xl border border-slate-100 bg-white text-[10px] font-bold uppercase tracking-wider text-slate-600 focus:outline-none cursor-pointer appearance-none shadow-sm hover:border-[#AE6965]/30 transition-colors"
                >
                  <option value="date-newest">Newest First</option>
                  <option value="date-oldest">Oldest First</option>
                  <option value="type-story">Stories First</option>
                </select>
                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 rotate-90 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Reports Grid */}
          <div className="min-h-[400px]">
            {loading ? (
              <div className="py-32 flex flex-col items-center justify-center">
                <Loader />
                <p className="mt-6 text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] animate-pulse">Syncing Archive</p>
              </div>
            ) : sortedReports.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                  {sortedReports.map((report, idx) => (
                    <motion.div
                      key={report.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => onViewReport(report)}
                      className="group bg-white p-6 rounded-[2rem] border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden"
                    >
                      {/* Card Background Accent */}
                      <div className={`absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full blur-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-500 ${report.type === 'story' ? 'bg-[#AE6965]' : 'bg-slate-900'}`} />

                      <div className="flex flex-col h-full">
                        <div className="flex items-start justify-between mb-6">
                          <div className={`
                            w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500
                            ${report.type === 'story' 
                              ? 'bg-[#AE6965]/10 text-[#AE6965] group-hover:bg-[#AE6965] group-hover:text-white group-hover:rotate-12' 
                              : 'bg-slate-50 text-slate-400 group-hover:bg-slate-900 group-hover:text-white group-hover:-rotate-12'}
                          `}>
                            {report.type === 'story' ? <Sparkles className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                            <button
                              onClick={(e) => handleDelete(e, report.id)}
                              className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border ${
                              report.type === 'story' 
                                ? 'bg-[#AE6965]/5 text-[#AE6965] border-[#AE6965]/10' 
                                : 'bg-slate-50 text-slate-400 border-slate-100'
                            }`}>
                              {report.type === 'story' ? 'Story' : 'Clinical'}
                            </span>
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                              {report.createdAt?.toDate ? report.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recent'}
                            </span>
                          </div>
                          
                          <h3 className="text-xl font-bold text-slate-900 group-hover:text-[#AE6965] transition-colors line-clamp-2 leading-tight">
                            {report.title}
                          </h3>

                          <div className="flex items-center gap-2 pt-2">
                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-black text-slate-400 border border-white shadow-sm">
                              {getInitials(report.patientData?.fullName)}
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                              {report.patientData?.fullName || 'Anonymous'}
                            </span>
                          </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
                          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <Clock className="w-3 h-3" />
                            {report.createdAt?.toDate ? report.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                          </div>
                          <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-[#AE6965] group-hover:text-white transition-all">
                            <ArrowUpRight className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="py-32 text-center">
                <div className="w-24 h-24 rounded-[2.5rem] bg-white border border-slate-100 shadow-sm flex items-center justify-center mx-auto mb-8 text-slate-200 group">
                  <BookOpen className="w-10 h-10 group-hover:scale-110 transition-transform duration-500" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Your archive is empty</h3>
                <p className="text-slate-500 mb-10 max-w-xs mx-auto font-medium">Ready to document your first case? We'll help you organize the details into a professional narrative.</p>
                <button
                  onClick={onNewReport}
                  className="px-8 py-4 rounded-2xl bg-[#AE6965] text-white font-bold shadow-xl shadow-[#AE6965]/20 hover:shadow-2xl hover:shadow-[#AE6965]/30 transition-all"
                >
                  Start Your First Case
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-20 flex flex-col md:flex-row items-center justify-between gap-6 px-4">
          <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
              System Online
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-200" />
            <span>v2.5.0 Clinical</span>
          </div>
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
            Secure medical workspace for modern healthcare professionals.
          </p>
        </div>
      </div>
    </div>
  );
};
