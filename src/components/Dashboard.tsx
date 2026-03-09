import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, orderBy, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Trash2, 
  Calendar, 
  ChevronRight, 
  Search,
  Plus,
  Loader2,
  Clock,
  User as UserIcon
} from 'lucide-react';

interface DashboardProps {
  onNewReport: () => void;
  onViewReport: (report: any) => void;
}

export const Dashboard = ({ onNewReport, onViewReport }: DashboardProps) => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    if (!auth.currentUser) return;
    
    setLoading(true);
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
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, reportId: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this report?")) return;

    try {
      await deleteDoc(doc(db, 'reports', reportId));
      setReports(reports.filter(r => r.id !== reportId));
    } catch (error) {
      console.error("Error deleting report:", error);
    }
  };

  const filteredReports = reports.filter(report => 
    report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.patientData?.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Clinical Dashboard</h1>
          <p className="text-slate-500">Manage and access your generated surgical case stories.</p>
        </div>
        <button
          onClick={onNewReport}
          className="bg-[#8B5E3C] hover:bg-[#724C31] text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-[#8B5E3C]/20 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
            <FileText className="w-5 h-5" />
          </div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Reports</p>
          <p className="text-2xl font-bold text-slate-900">{reports.length}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
            <Clock className="w-5 h-5" />
          </div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Recent Activity</p>
          <p className="text-2xl font-bold text-slate-900">
            {reports.length > 0 ? 'Today' : 'None'}
          </p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
            <UserIcon className="w-5 h-5" />
          </div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">User Profile</p>
          <p className="text-2xl font-bold text-slate-900 truncate">
            {auth.currentUser?.displayName || 'Physician'}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-bottom border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-slate-900">Saved Reports</h2>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-100 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/20 focus:border-[#8B5E3C] transition-all"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-50">
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mb-4" />
              <p>Loading your reports...</p>
            </div>
          ) : filteredReports.length > 0 ? (
            filteredReports.map((report) => (
              <motion.div
                key={report.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => onViewReport(report)}
                className="p-6 hover:bg-slate-50/50 transition-colors cursor-pointer group flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#8B5E3C]/10 text-[#8B5E3C] flex items-center justify-center group-hover:bg-[#8B5E3C] group-hover:text-white transition-all">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 group-hover:text-[#8B5E3C] transition-colors">
                      {report.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Calendar className="w-3 h-3" />
                        {report.createdAt?.toDate ? report.createdAt.toDate().toLocaleDateString() : 'Recently'}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <UserIcon className="w-3 h-3" />
                        {report.patientData?.fullName || 'Anonymous'}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleDelete(e, report.id)}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[#8B5E3C] group-hover:translate-x-1 transition-all" />
                </div>
              </motion.div>
            ))
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4 text-slate-300">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">No reports found</h3>
              <p className="text-slate-500 mb-6">Start by generating your first surgical case story.</p>
              <button
                onClick={onNewReport}
                className="text-[#8B5E3C] font-bold hover:underline"
              >
                Create new report
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
