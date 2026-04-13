/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useId } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Document, 
  Page, 
  Text, 
  View, 
  StyleSheet, 
  pdf, 
  Font 
} from '@react-pdf/renderer';
import { GoogleGenAI } from "@google/genai";
import { 
  User as UserIcon, 
  Zap, 
  Clock, 
  Stethoscope, 
  ClipboardList, 
  Scissors, 
  Users, 
  RotateCcw, 
  ChevronRight, 
  ChevronLeft, 
  Upload,
  FileText,
  CheckCircle2,
  Loader2,
  Menu,
  X,
  BookOpen,
  Download,
  Save,
  LogOut,
  LayoutDashboard,
  AlertCircle,
  Check,
  Calendar,
  Sparkles,
  Mic,
  MicOff,
  FileUp,
  History
} from 'lucide-react';

// Firebase imports
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, doc, getDocFromServer } from 'firebase/firestore';

// Component imports
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { Profile } from './components/Profile';
import { Loader } from './components/Loader';

import pptxgen from "pptxgenjs";

// --- Types ---

type StepId = 
  | 'specialty'
  | 'demographics' 
  | 'presenting_complaint' 
  | 'hpc_details' 
  | 'review_of_systems' 
  | 'past_medical_hx' 
  | 'past_surgical_hx' 
  | 'family_social_hx';

interface Step {
  id: StepId;
  label: string;
  icon: any;
  title: string;
  subtitle: string;
}

// --- Constants ---

const SPECIALTIES = [
  'Internal Medicine',
  'Surgical',
  'Paediatrics',
  'Obstetrics & Gynaecology',
  'General Practice'
];

const STEPS: Step[] = [
  { 
    id: 'specialty', 
    label: 'Specialty', 
    icon: Stethoscope, 
    title: 'Clinical Specialty', 
    subtitle: 'Select the clinical department for this case.' 
  },
  { 
    id: 'demographics', 
    label: 'Demographics', 
    icon: UserIcon, 
    title: 'Patient Demographics', 
    subtitle: 'Basic patient information.' 
  },
  { 
    id: 'presenting_complaint', 
    label: 'Presenting Complaint', 
    icon: Zap, 
    title: 'Presenting Complaint', 
    subtitle: 'What brings the patient in today?' 
  },
  { 
    id: 'hpc_details', 
    label: 'HPC Details', 
    icon: Clock, 
    title: 'History of Presenting Complaint', 
    subtitle: 'Timeline of the current issue.' 
  },
  { 
    id: 'review_of_systems', 
    label: 'Review of Systems', 
    icon: Stethoscope, 
    title: 'Systemic Review', 
    subtitle: 'Checking other body systems.' 
  },
  { 
    id: 'past_medical_hx', 
    label: 'Past Medical Hx', 
    icon: ClipboardList, 
    title: 'Medical Background', 
    subtitle: 'Medical history and current medications.' 
  },
  { 
    id: 'past_surgical_hx', 
    label: 'Past Surgical Hx', 
    icon: Scissors, 
    title: 'Surgical History', 
    subtitle: 'Past surgeries and injuries.' 
  },
  { 
    id: 'family_social_hx', 
    label: 'Family/Social Hx', 
    icon: Users, 
    title: 'Socio-Familial Context', 
    subtitle: 'Family history and lifestyle.' 
  },
];

// --- Components ---

const InputField = ({ label, placeholder, type = "text", value, onChange, required, onVoiceInput, isRecording, isTranscribing, recordingTimeLeft }: any) => {
  const id = useId();
  return (
    <div className="flex flex-col gap-1 sm:gap-1.5 w-full group">
      <label htmlFor={id} className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] group-focus-within:text-[#AE6965] transition-colors">
        {label} {required && <span className="text-red-500" aria-hidden="true">*</span>}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className="w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl border border-slate-100 bg-slate-50/30 text-sm sm:text-base text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-[#AE6965]/5 focus:border-[#AE6965] transition-all shadow-sm hover:border-slate-200"
        />
        <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 sm:gap-2">
          {isTranscribing && (
            <div className="flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-[#AE6965]/5 rounded-lg">
              <Loader2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 animate-spin text-[#AE6965]" />
              <span className="text-[7px] sm:text-[8px] font-bold text-[#AE6965] uppercase tracking-tighter">Transcribing</span>
            </div>
          )}
          {onVoiceInput && !isTranscribing && (
            <div className="flex items-center gap-1.5 sm:gap-2">
              {isRecording && recordingTimeLeft !== undefined && (
                <span className={`text-[9px] sm:text-[10px] font-black tabular-nums ${recordingTimeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
                  0:{recordingTimeLeft.toString().padStart(2, '0')}
                </span>
              )}
              <button 
                type="button"
                onClick={onVoiceInput}
                aria-label={isRecording ? `Stop recording ${label}` : `Start recording ${label}`}
                className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all ${isRecording ? 'bg-red-50 text-red-500 shadow-lg shadow-red-100' : 'text-slate-400 hover:text-[#AE6965] hover:bg-[#AE6965]/5'}`}
              >
                {isRecording ? <MicOff className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse" /> : <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TextAreaField = ({ label, placeholder, value, onChange, required, onVoiceInput, isRecording, isTranscribing, recordingTimeLeft }: any) => {
  const id = useId();
  return (
    <div className="flex flex-col gap-1 sm:gap-1.5 w-full group">
      <label htmlFor={id} className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] group-focus-within:text-[#AE6965] transition-colors">
        {label} {required && <span className="text-red-500" aria-hidden="true">*</span>}
      </label>
      <div className="relative">
        <textarea
          id={id}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          rows={4}
          className="w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl border border-slate-100 bg-slate-50/30 text-sm sm:text-base text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-[#AE6965]/5 focus:border-[#AE6965] transition-all shadow-sm hover:border-slate-200 min-h-[100px] sm:min-h-[120px]"
        />
        <div className="absolute right-3 sm:right-4 bottom-3 sm:bottom-4 flex items-center gap-1.5 sm:gap-2">
          {isTranscribing && (
            <div className="flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-[#AE6965]/5 rounded-lg">
              <Loader2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 animate-spin text-[#AE6965]" />
              <span className="text-[7px] sm:text-[8px] font-bold text-[#AE6965] uppercase tracking-tighter">Transcribing</span>
            </div>
          )}
          {onVoiceInput && !isTranscribing && (
            <div className="flex items-center gap-1.5 sm:gap-2">
              {isRecording && recordingTimeLeft !== undefined && (
                <span className={`text-[9px] sm:text-[10px] font-black tabular-nums ${recordingTimeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
                  0:{recordingTimeLeft.toString().padStart(2, '0')}
                </span>
              )}
              <button 
                type="button"
                onClick={onVoiceInput}
                aria-label={isRecording ? `Stop recording ${label}` : `Start recording ${label}`}
                className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all ${isRecording ? 'bg-red-50 text-red-500 shadow-lg shadow-red-100' : 'text-slate-400 hover:text-[#AE6965] hover:bg-[#AE6965]/5'}`}
              >
                {isRecording ? <MicOff className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse" /> : <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SelectField = ({ label, options, value, onChange, required }: any) => {
  const id = useId();
  return (
    <div className="flex flex-col gap-1 sm:gap-1.5 w-full group">
      <label htmlFor={id} className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] group-focus-within:text-[#AE6965] transition-colors">
        {label} {required && <span className="text-red-500" aria-hidden="true">*</span>}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className="w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl border border-slate-100 bg-slate-50/30 text-sm sm:text-base text-slate-700 focus:outline-none focus:ring-4 focus:ring-[#AE6965]/5 focus:border-[#AE6965] transition-all shadow-sm hover:border-slate-200 appearance-none cursor-pointer pr-10 sm:pr-12"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '0.875rem' }}
        >
          <option value="">Select an option</option>
          {options.map((opt: string) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

const FileUpload = ({ label, subtitle, onFileSelect, isProcessing }: any) => {
  const id = useId();
  return (
    <div className="flex flex-col gap-1 sm:gap-1.5 w-full">
      <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">
        {label}
      </span>
      <label 
        htmlFor={id}
        className={`w-full border-2 border-dashed border-slate-100 rounded-xl sm:rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center gap-2 sm:gap-3 bg-slate-50/30 hover:bg-slate-50/50 transition-colors cursor-pointer group ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input 
          id={id}
          type="file" 
          className="hidden" 
          accept="image/*,.pdf" 
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFileSelect(file);
          }}
          disabled={isProcessing}
        />
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400 group-hover:text-[#AE6965] transition-colors">
          {isProcessing ? <Loader size="sm" /> : <Upload className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />}
        </div>
        <div className="text-center">
          <p className="text-xs sm:text-sm font-bold text-slate-700">{isProcessing ? 'Processing...' : label}</p>
          <p className="text-[8px] sm:text-[10px] text-slate-400 uppercase tracking-tight">{subtitle}</p>
        </div>
      </label>
    </div>
  );
};

// --- PDF Styles ---

const pdfStyles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#FFFFFF',
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 20,
    marginBottom: 30,
  },
  brand: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  reportType: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
  },
  meta: {
    textAlign: 'right',
  },
  date: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748B',
  },
  stepLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
  },
  titleSection: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
  },
  content: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -10,
  },
  gridItem: {
    width: '50%',
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  fullWidth: {
    width: '100%',
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  fieldLabel: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 10,
    color: '#334155',
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  systemSection: {
    marginBottom: 20,
  },
  systemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  systemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#AE6965',
    marginRight: 6,
  },
  systemTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  footerText: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#CBD5E1',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  // Story Report Specific Styles
  coverPage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 60,
  },
  coverTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40,
    textAlign: 'center',
  },
  coverSubtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  coverTopic: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 40,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 4,
  },
  paragraph: {
    fontSize: 10,
    lineHeight: 1.6,
    color: '#334155',
    marginBottom: 10,
    textAlign: 'justify',
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingLeft: 10,
  },
  bullet: {
    width: 15,
    fontSize: 10,
  },
  listContent: {
    flex: 1,
    fontSize: 10,
    lineHeight: 1.4,
    color: '#334155',
  },
});

// --- PDF Document Components ---

const getInitials = (name: string) => {
  if (!name) return 'N/A';
  return name.split(' ').map(n => n[0]).join('.').toUpperCase();
};

const MedicalReportPDF = ({ formData }: { formData: any }) => (
  <Document>
    {STEPS.map((step, index) => (
      <Page key={step.id} size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          <View>
            <Text style={pdfStyles.brand}>Malae Medical Workspace</Text>
            <Text style={pdfStyles.reportType}>Case Details Report</Text>
          </View>
          <View style={pdfStyles.meta}>
            <Text style={pdfStyles.date}>{new Date().toLocaleDateString()}</Text>
            <Text style={pdfStyles.stepLabel}>{step.label}</Text>
          </View>
        </View>

        <View style={pdfStyles.titleSection}>
          <Text style={pdfStyles.title}>{step.title}</Text>
          <Text style={pdfStyles.subtitle}>{step.subtitle}</Text>
        </View>

        <View style={pdfStyles.content}>
          {step.id === 'specialty' && (
            <View style={pdfStyles.fullWidth}>
              <Text style={pdfStyles.fieldLabel}>Clinical Specialty</Text>
              <Text style={pdfStyles.fieldValue}>{formData.specialty || 'General Practice'}</Text>
            </View>
          )}

          {step.id === 'demographics' && (
            <View style={pdfStyles.grid}>
              {[
                { label: 'Date of Admission', value: formData.admissionDate },
                { label: 'Patient Initials', value: getInitials(formData.fullName) },
                { label: 'Age (years)', value: formData.age },
                { label: 'Sex', value: formData.sex },
                { label: 'Tribe/Ethnicity', value: formData.ethnicity },
                { label: 'Address/Location', value: formData.address },
                { label: 'Religion', value: formData.religion },
                { label: 'Occupation', value: formData.occupation },
                { label: 'Next of Kin (Initials)', value: formData.nextOfKin },
                { label: 'Relationship', value: formData.relationship },
              ].map((field, i) => (
                <View key={i} style={pdfStyles.gridItem}>
                  <Text style={pdfStyles.fieldLabel}>{field.label}</Text>
                  <Text style={pdfStyles.fieldValue}>{field.value || 'N/A'}</Text>
                </View>
              ))}
            </View>
          )}

          {step.id === 'presenting_complaint' && (
            <View>
              <View style={pdfStyles.fullWidth}>
                <Text style={pdfStyles.fieldLabel}>Chief Complaint</Text>
                <Text style={pdfStyles.fieldValue}>{formData.chiefComplaint || 'N/A'}</Text>
              </View>
              <View style={pdfStyles.fullWidth}>
                <Text style={pdfStyles.fieldLabel}>Duration</Text>
                <Text style={pdfStyles.fieldValue}>{formData.duration || 'N/A'}</Text>
              </View>
            </View>
          )}

          {step.id === 'hpc_details' && (
            <View style={pdfStyles.grid}>
              {[
                { label: 'Onset', value: formData.onset },
                { label: 'Progression', value: formData.progression },
                { label: 'Character', value: formData.character },
                { label: 'Severity', value: formData.severity },
                { label: 'Location', value: formData.location },
                { label: 'Radiation', value: formData.radiation },
              ].map((field, i) => (
                <View key={i} style={pdfStyles.gridItem}>
                  <Text style={pdfStyles.fieldLabel}>{field.label}</Text>
                  <Text style={pdfStyles.fieldValue}>{field.value || 'N/A'}</Text>
                </View>
              ))}
              <View style={pdfStyles.fullWidth}>
                <Text style={pdfStyles.fieldLabel}>Associated Symptoms (Present)</Text>
                <Text style={pdfStyles.fieldValue}>{formData.associatedSymptoms || 'N/A'}</Text>
              </View>
              <View style={pdfStyles.fullWidth}>
                <Text style={pdfStyles.fieldLabel}>Important Negative Findings</Text>
                <Text style={pdfStyles.fieldValue}>{formData.negativeFindings || 'N/A'}</Text>
              </View>
              {[
                { label: 'Aggravating Factors', value: formData.aggravating },
                { label: 'Relieving Factors', value: formData.relieving },
                { label: 'Previous Treatment', value: formData.prevTreatment },
                { label: 'Response to Treatment', value: formData.respTreatment },
              ].map((field, i) => (
                <View key={i} style={pdfStyles.gridItem}>
                  <Text style={pdfStyles.fieldLabel}>{field.label}</Text>
                  <Text style={pdfStyles.fieldValue}>{field.value || 'N/A'}</Text>
                </View>
              ))}
              <View style={pdfStyles.fullWidth}>
                <Text style={pdfStyles.fieldLabel}>Impact on Daily Activities</Text>
                <Text style={pdfStyles.fieldValue}>{formData.impact || 'N/A'}</Text>
              </View>
            </View>
          )}

          {step.id === 'review_of_systems' && (
            <View>
              {['GENERAL', 'CARDIOVASCULAR', 'RESPIRATORY', 'GASTROINTESTINAL'].map(system => (
                <View key={system} style={pdfStyles.systemSection}>
                  <View style={pdfStyles.systemHeader}>
                    <View style={pdfStyles.systemDot} />
                    <Text style={pdfStyles.systemTitle}>{system}</Text>
                  </View>
                  <View style={pdfStyles.grid}>
                    <View style={pdfStyles.gridItem}>
                      <Text style={pdfStyles.fieldLabel}>Symptoms Present</Text>
                      <Text style={pdfStyles.fieldValue}>{formData[`${system}_present`] || 'N/A'}</Text>
                    </View>
                    <View style={pdfStyles.gridItem}>
                      <Text style={pdfStyles.fieldLabel}>Symptoms Denied</Text>
                      <Text style={pdfStyles.fieldValue}>{formData[`${system}_denied`] || 'N/A'}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {step.id === 'past_medical_hx' && (
            <View>
              <View style={pdfStyles.fullWidth}>
                <Text style={pdfStyles.fieldLabel}>Chronic Medical Conditions</Text>
                <Text style={pdfStyles.fieldValue}>{formData.chronicConditions || 'N/A'}</Text>
              </View>
              <View style={pdfStyles.fullWidth}>
                <Text style={pdfStyles.fieldLabel}>Current Pharmacotherapy</Text>
                <Text style={pdfStyles.fieldValue}>{formData.medications || 'N/A'}</Text>
              </View>
              <View style={pdfStyles.fullWidth}>
                <Text style={pdfStyles.fieldLabel}>Allergies & Hypersensitivities</Text>
                <Text style={pdfStyles.fieldValue}>{formData.allergies || 'N/A'}</Text>
              </View>
            </View>
          )}

          {step.id === 'past_surgical_hx' && (
            <View>
              <View style={pdfStyles.fullWidth}>
                <Text style={pdfStyles.fieldLabel}>Previous Surgeries</Text>
                <Text style={pdfStyles.fieldValue}>{formData.surgeries || 'N/A'}</Text>
              </View>
              <View style={pdfStyles.fullWidth}>
                <Text style={pdfStyles.fieldLabel}>Major Trauma/Fractures</Text>
                <Text style={pdfStyles.fieldValue}>{formData.trauma || 'N/A'}</Text>
              </View>
              <View style={pdfStyles.fullWidth}>
                <Text style={pdfStyles.fieldLabel}>Blood Transfusion History</Text>
                <Text style={pdfStyles.fieldValue}>{formData.transfusions || 'N/A'}</Text>
              </View>
            </View>
          )}

          {step.id === 'family_social_hx' && (
            <View>
              <View style={pdfStyles.fullWidth}>
                <Text style={pdfStyles.fieldLabel}>Familial Health Patterns</Text>
                <Text style={pdfStyles.fieldValue}>{formData.familyHistory || 'N/A'}</Text>
              </View>
              <View style={pdfStyles.grid}>
                {[
                  { label: 'Alcohol Consumption', value: formData.alcohol },
                  { label: 'Tobacco Consumption', value: formData.tobacco },
                  { label: 'Current Marital Status', value: formData.maritalStatus },
                  { label: 'Household Dependents', value: formData.dependents },
                ].map((field, i) => (
                  <View key={i} style={pdfStyles.gridItem}>
                    <Text style={pdfStyles.fieldLabel}>{field.label}</Text>
                    <Text style={pdfStyles.fieldValue}>{field.value || 'N/A'}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        <View style={pdfStyles.footer}>
          <Text style={pdfStyles.footerText}>Confidential Medical Record</Text>
          <Text style={pdfStyles.footerText}>Page {index + 1} of {STEPS.length}</Text>
        </View>
      </Page>
    ))}
  </Document>
);

const ClinicalCaseStoryPDF = ({ formData, storyData, title }: { formData: any, storyData: any, title?: string }) => (
  <Document>
    {/* Page 1: Cover Page */}
    <Page size="A4" style={pdfStyles.page}>
      <View style={pdfStyles.coverPage}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20 }}>{getInitials(formData.fullName)}</Text>
        <Text style={{ fontSize: 12, color: '#AE6965', marginBottom: 40, textTransform: 'uppercase', letterSpacing: 2 }}>{formData.specialty || 'General Clinical'} Case</Text>
        <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 60 }}>CASE STORY</Text>
        <Text style={{ fontSize: 16, fontWeight: 'bold', textAlign: 'center', paddingHorizontal: 40 }}>TOPIC: {title?.toUpperCase() || storyData.impression?.toUpperCase() || formData.chiefComplaint?.toUpperCase() || 'CLINICAL CASE'}</Text>
      </View>
      <View style={pdfStyles.footer}>
        <Text style={pdfStyles.footerText}>Malae Medical Workspace</Text>
        <Text style={pdfStyles.footerText}>Page 1</Text>
      </View>
    </Page>

    {/* Page 2: Demographics & History */}
    <Page size="A4" style={pdfStyles.page}>
      <View style={{ marginBottom: 20 }}>
        {[
          { label: 'Date of admission', value: formData.admissionDate },
          { label: 'Patient Initials', value: getInitials(formData.fullName) },
          { label: 'Age', value: formData.age ? `${formData.age}yrs` : '' },
          { label: 'Sex', value: formData.sex },
          { label: 'Tribe', value: formData.ethnicity },
          { label: 'Address', value: formData.address },
          { label: 'Religion', value: formData.religion },
          { label: 'Occupation', value: formData.occupation },
          { label: 'Next of Kin', value: formData.nextOfKin },
          { label: 'Relationship', value: formData.relationship },
        ].map((field, i) => (
          <Text key={i} style={{ fontSize: 10, marginBottom: 4 }}>
            <Text style={{ fontWeight: 'bold' }}>{field.label}; </Text>
            {field.value || 'N/A'}
          </Text>
        ))}
      </View>

      <Text style={{ fontSize: 11, fontWeight: 'bold', marginTop: 15, marginBottom: 5 }}>Presenting complaint;</Text>
      <View style={{ flexDirection: 'row', marginBottom: 15 }}>
        <Text style={{ fontSize: 10, marginRight: 5 }}>✓</Text>
        <Text style={{ fontSize: 10 }}>{formData.chiefComplaint} x {formData.duration}</Text>
      </View>

      <Text style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 5 }}>History of presenting complaint</Text>
      <Text style={pdfStyles.paragraph}>{storyData.hpcNarrative}</Text>

      <Text style={{ fontSize: 11, fontWeight: 'bold', marginTop: 10, marginBottom: 5 }}>Review of other systems</Text>
      <Text style={pdfStyles.paragraph}>{storyData.rosNarrative}</Text>

      <Text style={{ fontSize: 11, fontWeight: 'bold', marginTop: 10, marginBottom: 5 }}>Past Medical history:</Text>
      <Text style={pdfStyles.paragraph}>{storyData.pmhNarrative}</Text>

      <Text style={{ fontSize: 11, fontWeight: 'bold', marginTop: 10, marginBottom: 5 }}>Past surgical history:</Text>
      <Text style={pdfStyles.paragraph}>{storyData.pshNarrative}</Text>

      <Text style={{ fontSize: 11, fontWeight: 'bold', marginTop: 10, marginBottom: 5 }}>Family Social History:</Text>
      <Text style={pdfStyles.paragraph}>{storyData.fshNarrative}</Text>

      <View style={pdfStyles.footer}>
        <Text style={pdfStyles.footerText}>Confidential Medical Record</Text>
        <Text style={pdfStyles.footerText}>Page 2</Text>
      </View>
    </Page>

    {/* Page 3: Differentials & Examination */}
    <Page size="A4" style={pdfStyles.page}>
      <Text style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 10 }}>Differential diagnoses</Text>
      {storyData.differentials?.map((diff: any, i: number) => (
        <View key={i} style={{ marginBottom: 10 }}>
          <Text style={{ fontSize: 10, lineHeight: 1.4 }}>
            <Text style={{ fontWeight: 'bold' }}>{i + 1}. {diff.diagnosis}</Text> {diff.reasoning}
          </Text>
        </View>
      ))}

      <Text style={{ fontSize: 11, fontWeight: 'bold', marginTop: 20, marginBottom: 10 }}>On Examination</Text>
      <Text style={pdfStyles.paragraph}>{storyData.examinationNarrative}</Text>

      <Text style={{ fontSize: 11, fontWeight: 'bold', marginTop: 15, marginBottom: 5 }}>Impression;</Text>
      <Text style={pdfStyles.paragraph}>{storyData.impression}</Text>

      <Text style={{ fontSize: 11, fontWeight: 'bold', marginTop: 10, marginBottom: 5 }}>Plan</Text>
      {storyData.plan?.map((item: string, i: number) => (
        <View key={i} style={{ flexDirection: 'row', marginBottom: 4, paddingLeft: 10 }}>
          <Text style={{ fontSize: 10, width: 15 }}>{i + 1}.</Text>
          <Text style={{ fontSize: 10, flex: 1 }}>{item}</Text>
        </View>
      ))}

      <View style={pdfStyles.footer}>
        <Text style={pdfStyles.footerText}>Confidential Medical Record</Text>
        <Text style={pdfStyles.footerText}>Page 3</Text>
      </View>
    </Page>

    {/* Page 4: Case Discussion */}
    <Page size="A4" style={pdfStyles.page}>
      <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' }}>CASE DISCUSSION</Text>
      
      {storyData.caseDiscussionSections?.map((section: any, i: number) => (
        <View key={i} style={{ marginBottom: 15 }}>
          <Text style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 5 }}>{section.title}</Text>
          <Text style={pdfStyles.paragraph}>{section.content}</Text>
        </View>
      )) || <Text style={pdfStyles.paragraph}>{storyData.caseDiscussion}</Text>}

      <Text style={{ fontSize: 11, fontWeight: 'bold', marginTop: 20, marginBottom: 10 }}>References</Text>
      {storyData.references?.map((ref: string, i: number) => (
        <View key={i} style={{ flexDirection: 'row', marginBottom: 5 }}>
          <Text style={{ fontSize: 9, width: 15 }}>{i + 1}.</Text>
          <Text style={{ fontSize: 9, flex: 1 }}>{ref}</Text>
        </View>
      ))}

      <View style={pdfStyles.footer}>
        <Text style={pdfStyles.footerText}>Confidential Medical Record</Text>
        <Text style={pdfStyles.footerText}>Page 4</Text>
      </View>
    </Page>
  </Document>
);

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState<'dashboard' | 'generator' | 'viewer' | 'profile'>('dashboard');
  const [generatorMode, setGeneratorMode] = useState<'selection' | 'form' | 'upload' | 'audio'>('selection');
  const [selectedReport, setSelectedReport] = useState<any>(null);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [formData, setFormData] = useState<any>(() => {
    const saved = localStorage.getItem('malae_form_data');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('malae_form_data', JSON.stringify(formData));
  }, [formData]);
  const [completedSteps, setCompletedSteps] = useState<Set<StepId>>(new Set());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingField, setRecordingField] = useState<string | null>(null);
  const [recordingTimeLeft, setRecordingTimeLeft] = useState(30);
  const [transcribingField, setTranscribingField] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [showConfirmModal, setShowConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ show: false, title: '', message: '', onConfirm: () => {} });
  const [originalReportStatus, setOriginalReportStatus] = useState<'idle' | 'generating' | 'completed' | 'error'>('idle');
  const [storyReportStatus, setStoryReportStatus] = useState<'idle' | 'generating' | 'completed' | 'error'>('idle');

  const isGenerating = originalReportStatus === 'generating' || storyReportStatus === 'generating';
  const [isSaving, setIsSaving] = useState(false);
  const [generationStatus, setGenerationStatus] = useState("");
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function testConnection() {
      const path = 'test/connection';
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. The client is offline.");
        }
        handleFirestoreError(error, OperationType.GET, path);
      }
    }
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setAuthLoading(false);
    });

    const savedData = localStorage.getItem('malae_form_data');
    if (savedData) {
      try {
        setFormData(JSON.parse(savedData));
      } catch (e) {
        console.error("Error loading autosave data:", e);
      }
    }

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (Object.keys(formData).length > 0) {
      localStorage.setItem('malae_form_data', JSON.stringify(formData));
    }
  }, [formData]);

  const startVoiceInput = async (field: string) => {
    if (isRecording && recordingField === field) {
      stopVoiceInput();
      return;
    }
    
    if (isRecording) {
      stopVoiceInput();
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob, field);
        setRecordingField(null);
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingField(field);
      setRecordingTimeLeft(30);

      // Start timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTimeLeft((prev) => {
          if (prev <= 1) {
            stopVoiceInput();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopVoiceInput = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingField(null);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const transcribeAudio = async (blob: Blob, field: string) => {
    setGenerationStatus("Transcribing clinical audio...");
    setTranscribingField(field);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        try {
          const base64Audio = (reader.result as string).split(',')[1];
          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
          const model = "gemini-3-flash-preview";
          
          const response = await ai.models.generateContent({
            model,
            contents: [{
              parts: [
                { text: "Transcribe this clinical audio accurately. Return only the transcription text. If the audio is silent or unintelligible, return an empty string." },
                { inlineData: { data: base64Audio, mimeType: 'audio/webm' } }
              ]
            }]
          });

          const transcription = response.text;
          if (transcription && transcription.trim()) {
            updateField(field, (prev: string) => {
              const current = prev || '';
              return current ? `${current} ${transcription.trim()}` : transcription.trim();
            });
          }
        } catch (err) {
          console.error("Transcription error:", err);
        } finally {
          setTranscribingField(null);
          setGenerationStatus("");
        }
      };
    } catch (err) {
      console.error("FileReader error:", err);
      setTranscribingField(null);
      setGenerationStatus("");
    }
  };

  const handleFileProcessing = async (file: File) => {
    setIsProcessingFile(true);
    setGenerationStatus("Extracting clinical data from file...");
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        const mimeType = file.type;
        
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const model = "gemini-3-flash-preview";
        
        const prompt = `
          Extract clinical data from this ${file.type.includes('pdf') ? 'PDF' : 'image'} and map it to the following JSON structure. 
          The case is in the specialty of ${formData.specialty || 'General Medicine'}.
          If a field is not found, leave it blank.
          
          Structure:
          {
            "fullName": "...",
            "age": "...",
            "sex": "...",
            "chiefComplaint": "...",
            "hpi": "...",
            "pmh": "...",
            "surgeries": "...",
            "allergies": "...",
            "vitals": "..."
          }
        `;

        const response = await ai.models.generateContent({
          model,
          contents: [
            { text: prompt },
            { inlineData: { data: base64Data, mimeType } }
          ],
          config: { responseMimeType: "application/json" }
        });

        const extractedData = JSON.parse(response.text);
        setFormData((prev: any) => ({ ...prev, ...extractedData }));
        setIsProcessingFile(false);
      };
    } catch (err) {
      console.error("File processing error:", err);
      setIsProcessingFile(false);
    }
  };

  const handleFullCaseFileProcessing = async (file: File) => {
    setIsProcessingFile(true);
    setGenerationStatus("Extracting full clinical data from file...");
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        const mimeType = file.type;
        
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const model = "gemini-3-flash-preview";
        
        const prompt = `
          Extract all clinical data from this ${file.type.includes('pdf') ? 'PDF' : 'image'} and map it to the following JSON structure. 
          If a field is not found, leave it blank.
          
          Structure:
          {
            "admissionDate": "...",
            "fullName": "...",
            "age": "...",
            "sex": "...",
            "ethnicity": "...",
            "address": "...",
            "religion": "...",
            "occupation": "...",
            "nextOfKin": "...",
            "relationship": "...",
            "chiefComplaint": "...",
            "duration": "...",
            "onset": "...",
            "progression": "...",
            "character": "...",
            "severity": "...",
            "location": "...",
            "radiation": "...",
            "associatedSymptoms": "...",
            "negativeFindings": "...",
            "aggravating": "...",
            "relieving": "...",
            "prevTreatment": "...",
            "respTreatment": "...",
            "impact": "...",
            "GENERAL_present": "...",
            "GENERAL_denied": "...",
            "CARDIOVASCULAR_present": "...",
            "CARDIOVASCULAR_denied": "...",
            "RESPIRATORY_present": "...",
            "RESPIRATORY_denied": "...",
            "GASTROINTESTINAL_present": "...",
            "GASTROINTESTINAL_denied": "...",
            "chronicConditions": "...",
            "medications": "...",
            "allergies": "...",
            "surgeries": "...",
            "trauma": "...",
            "transfusions": "...",
            "familyHistory": "...",
            "alcohol": "...",
            "tobacco": "...",
            "maritalStatus": "...",
            "dependents": "..."
          }
        `;

        const response = await ai.models.generateContent({
          model,
          contents: [
            { text: prompt },
            { inlineData: { data: base64Data, mimeType } }
          ],
          config: { responseMimeType: "application/json" }
        });

        const extractedData = JSON.parse(response.text);
        setFormData((prev: any) => ({ ...prev, ...extractedData }));
        setGeneratorMode('form');
        setIsProcessingFile(false);
      };
    } catch (err) {
      console.error("File processing error:", err);
      setIsProcessingFile(false);
    }
  };

  const handleFullCaseAudioTranscription = async (blob: Blob) => {
    setIsProcessingFile(true);
    setGenerationStatus("Transcribing and extracting clinical data from audio...");
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const model = "gemini-3-flash-preview";
        
        const prompt = `
          Transcribe this clinical case presentation and extract all relevant data into the following JSON structure. 
          Be extremely thorough and professional. If a field is not found, leave it blank.
          
          Structure:
          {
            "admissionDate": "YYYY-MM-DD",
            "fullName": "Patient Initials",
            "age": "Number",
            "sex": "Male/Female",
            "ethnicity": "...",
            "address": "...",
            "religion": "...",
            "occupation": "...",
            "nextOfKin": "...",
            "relationship": "...",
            "chiefComplaint": "...",
            "duration": "...",
            "onset": "...",
            "progression": "...",
            "character": "...",
            "severity": "...",
            "location": "...",
            "radiation": "...",
            "associatedSymptoms": "...",
            "negativeFindings": "...",
            "aggravating": "...",
            "relieving": "...",
            "prevTreatment": "...",
            "respTreatment": "...",
            "impact": "...",
            "GENERAL_present": "...",
            "GENERAL_denied": "...",
            "CARDIOVASCULAR_present": "...",
            "CARDIOVASCULAR_denied": "...",
            "RESPIRATORY_present": "...",
            "RESPIRATORY_denied": "...",
            "GASTROINTESTINAL_present": "...",
            "GASTROINTESTINAL_denied": "...",
            "chronicConditions": "...",
            "medications": "...",
            "allergies": "...",
            "surgeries": "...",
            "trauma": "...",
            "transfusions": "...",
            "familyHistory": "...",
            "alcohol": "...",
            "tobacco": "...",
            "maritalStatus": "...",
            "dependents": "..."
          }
        `;

        const response = await ai.models.generateContent({
          model,
          contents: [
            { text: prompt },
            { inlineData: { data: base64Audio, mimeType: 'audio/webm' } }
          ],
          config: { responseMimeType: "application/json" }
        });

        const extractedData = JSON.parse(response.text);
        setFormData((prev: any) => ({ ...prev, ...extractedData }));
        setGeneratorMode('form');
        setIsProcessingFile(false);
      };
    } catch (err) {
      console.error("Audio processing error:", err);
      setIsProcessingFile(false);
    }
  };

  const startFullCaseAudioInput = async () => {
    if (isRecording) {
      stopFullCaseAudioInput();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleFullCaseAudioTranscription(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      // Allow longer recording for full case (e.g., 2 minutes)
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          stopFullCaseAudioInput();
        }
      }, 120000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopFullCaseAudioInput = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const generatePPT = async (formData: any, storyData: any) => {
    const pres = new pptxgen();
    
    // Title Slide
    const slide1 = pres.addSlide();
    slide1.addText("Clinical Case Presentation", { x: 1, y: 1, w: 8, h: 1, fontSize: 36, bold: true, color: "363636", align: "center" });
    slide1.addText(storyData.impression || formData.chiefComplaint || "Clinical Case", { x: 1, y: 2, w: 8, h: 1, fontSize: 24, color: "AE6965", align: "center" });
    slide1.addText(`Patient: ${getInitials(formData.fullName)} | Age: ${formData.age} | Sex: ${formData.sex}`, { x: 1, y: 4, w: 8, h: 1, fontSize: 18, color: "666666", align: "center" });
    slide1.addText(`Specialty: ${formData.specialty || 'General'}`, { x: 1, y: 5, w: 8, h: 0.5, fontSize: 14, color: "999999", align: "center" });

    // Demographics
    const slide2 = pres.addSlide();
    slide2.addText("Patient Demographics", { x: 0.5, y: 0.5, w: 9, h: 0.5, fontSize: 24, bold: true, color: "AE6965" });
    slide2.addText([
      { text: `Initials: ${getInitials(formData.fullName)}`, options: { bullet: true } },
      { text: `Age: ${formData.age}`, options: { bullet: true } },
      { text: `Sex: ${formData.sex}`, options: { bullet: true } },
      { text: `Occupation: ${formData.occupation}`, options: { bullet: true } },
      { text: `Address: ${formData.address}`, options: { bullet: true } },
      { text: `Religion: ${formData.religion}`, options: { bullet: true } },
    ], { x: 0.5, y: 1.5, w: 9, h: 3.5, fontSize: 18 });

    // History of Presenting Complaint
    const slide3 = pres.addSlide();
    slide3.addText("History of Presenting Complaint", { x: 0.5, y: 0.5, w: 9, h: 0.5, fontSize: 24, bold: true, color: "AE6965" });
    slide3.addText(storyData.hpcNarrative, { x: 0.5, y: 1.5, w: 9, h: 4, fontSize: 14 });

    // Differentials
    const slide4 = pres.addSlide();
    slide4.addText("Differential Diagnoses", { x: 0.5, y: 0.5, w: 9, h: 0.5, fontSize: 24, bold: true, color: "AE6965" });
    const diffs = storyData.differentials?.map((d: any) => ({ text: `${d.diagnosis}: ${d.reasoning}`, options: { bullet: true } })) || [];
    slide4.addText(diffs, { x: 0.5, y: 1.5, w: 9, h: 4, fontSize: 14 });

    // Impression & Plan
    const slide5 = pres.addSlide();
    slide5.addText("Impression & Management Plan", { x: 0.5, y: 0.5, w: 9, h: 0.5, fontSize: 24, bold: true, color: "AE6965" });
    slide5.addText(`Impression: ${storyData.impression}`, { x: 0.5, y: 1.2, w: 9, h: 1, fontSize: 16, bold: true });
    const planItems = storyData.plan?.map((p: string) => ({ text: p, options: { bullet: true } })) || [];
    slide5.addText(planItems, { x: 0.5, y: 2.5, w: 9, h: 3, fontSize: 14 });

    pres.writeFile({ fileName: `Clinical_Case_${getInitials(formData.fullName)}.pptx` });
  };

  const handleLogout = async () => {
    setShowConfirmModal({
      show: true,
      title: 'Sign Out',
      message: 'Are you sure you want to sign out of your clinical session?',
      onConfirm: async () => {
        try {
          await signOut(auth);
          localStorage.removeItem('malae_form_data');
          setView('dashboard');
        } catch (error) {
          console.error("Logout Error:", error);
        }
        setShowConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  };

  const handleSaveReport = async (storyData: any, type: 'original' | 'story' = 'story') => {
    if (!user) return;
    setIsSaving(true);
    try {
      const reportPayload: any = {
        userId: user.uid,
        title: type === 'story' ? (storyData?.impression || formData.chiefComplaint || 'Clinical Case') : (formData.chiefComplaint || 'Clinical Case'),
        type,
        patientData: formData,
        reportData: storyData,
        createdAt: serverTimestamp()
      };

      // Extract hpcNarrative for easier querying if it's a story report
      if (type === 'story' && storyData?.hpcNarrative) {
        reportPayload.hpcNarrative = storyData.hpcNarrative;
      }

      const path = 'reports';
      try {
        await addDoc(collection(db, 'reports'), reportPayload);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
      }
      // Silent save for automatic generations to avoid interrupting flow
      console.log(`${type} report saved successfully`);
    } catch (error) {
      console.error("Error saving report:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const currentStep = STEPS[currentStepIndex];
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F2F3F0]">
        <Loader />
      </div>
    );
  }

  if (!user) {
    return <Auth onSuccess={() => setView('dashboard')} />;
  }

  const handleCompileReport = async () => {
    setOriginalReportStatus('idle');
    setStoryReportStatus('idle');
    setShowReportModal(true);
  };

  const downloadOriginalReport = async () => {
    setOriginalReportStatus('generating');
    setGenerationStatus("Generating clinical data report...");
    try {
      // Save original report to dashboard
      if (user) {
        await handleSaveReport(null, 'original');
      }
      const blob = await pdf(<MedicalReportPDF formData={formData} />).toBlob();
      triggerDownload(blob, `Clinical_Report_${formData.fullName || 'Patient'}`);
      setOriginalReportStatus('completed');
      setTimeout(() => setOriginalReportStatus('idle'), 3000);
    } catch (error: any) {
      console.error("PDF Generation Error:", error);
      setOriginalReportStatus('error');
    }
  };

  const downloadStoryReport = async () => {
    setStoryReportStatus('generating');
    setGenerationStatus("AI is analyzing clinical data and writing case story...");
    
    const fallbackData = {
      hpcNarrative: "The clinical narrative could not be generated at this time. Please review the raw data in the original report.",
      rosNarrative: "Review of systems analysis unavailable.",
      pmhNarrative: "Medical history summary unavailable.",
      pshNarrative: "Surgical history summary unavailable.",
      fshNarrative: "Social history summary unavailable.",
      examinationNarrative: "Physical examination write-up unavailable.",
      impression: "Clinical impression pending further analysis.",
      plan: ["Review clinical data manually", "Re-attempt report generation", "Consult senior staff"],
      differentials: [
        { diagnosis: "Clinical Correlation Required", reasoning: "The AI was unable to synthesize differential diagnoses from the current dataset." }
      ],
      caseDiscussionSections: [
        { title: "System Notice", content: "The academic case discussion is currently unavailable due to a processing error. This may occur if the clinical data provided is insufficient for deep synthesis." }
      ],
      references: ["Malae Clinical Intelligence System Documentation"]
    };

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = "gemini-3-flash-preview";
      
      const prompt = `
        You are a Senior Consultant specializing in ${formData.specialty || 'General Medicine'} at a tertiary academic hospital. Based on the following patient data, synthesize a high-level, cohesive academic clinical case write-up.
        Strictly adhere to formal medical writing standards, utilizing precise clinical nomenclature and a rigorous academic tone consistent with peer-reviewed case reports in ${formData.specialty || 'this field'}.

        Patient Data:
        ${JSON.stringify(formData, null, 2)}
        
        Instructions:
        1. HPC Narrative: Construct a detailed, chronological narrative of the history of presenting complaint (HPC). Utilize professional syntax such as "presented with a [duration] history of...", "insidious vs. acute onset", "gradually progressive nature", and "pertinent negatives including...". Ensure the narrative flows logically from the primary complaint to associated symptoms and clinical progression.
        2. ROS Narrative: Synthesize a cohesive summary of the Review of Systems (ROS). Group findings by system (e.g., Constitutional, Cardiorespiratory, Gastrointestinal) and highlight both positive findings and significant negatives in a professional, concise manner.
        3. PMH Narrative: Summarize relevant Past Medical History (PMH), emphasizing chronic comorbidities (e.g., "known retroviral disease on HAART", "hypertensive on ACE inhibitors") and their potential impact on the current presentation.
        4. PSH Narrative: Detail the Past Surgical History (PSH) and trauma history, noting dates, procedures, and any relevant perioperative complications.
        5. FSH Narrative: Summarize Family and Social History (FSH), focusing on hereditary predispositions, lifestyle factors (tobacco/alcohol units), and socioeconomic context relevant to clinical recovery.
        6. Examination Narrative: Provide a professional, structured write-up of physical examination findings. Include:
           - General Examination: Nutritional status, pallor, jaundice, lymphadenopathy, edema.
           - Vitals: Hemodynamic stability and physiological parameters.
           - Local/Regional Examination: Detailed description using appropriate clinical descriptors.
           - Systemic Examination: Focused cardiorespiratory, abdominal, and neurological assessments.
        7. Differential Diagnoses: Synthesize 5-10 differential diagnoses. For each, provide a rigorous clinical justification. Use "in view of [specific positive findings]" to support the diagnosis and "unlikely because of [specific negative findings or clinical inconsistencies]" to argue against it. Maintain a high level of diagnostic precision and prioritize by clinical likelihood.
        8. Case Discussion: Provide an exhaustive academic discourse. This section must be deeply analytical and evidence-based. Include the following sub-sections:
           - Definition and Pathophysiology: Discuss the molecular, cellular, or anatomical basis of the condition.
           - Pathophysiological Mechanisms: Detail the disease progression, etiology, and typical sequelae.
           - Clinical Features and Presentation: Contrast the typical presentation with this specific patient's findings.
           - Investigations and Diagnostic Workup: Discuss the gold standard investigations, relevant imaging (e.g., USG, CT, MRI), and laboratory markers based on current clinical guidelines.
           - Management and Treatment Approach: Detail the management options, including specific techniques if applicable and care protocols.
        9. Impression: Provide a concise, multi-axial clinical impression (e.g., "A [age]/[sex] patient with [comorbidities] presenting with clinical features highly suggestive of [primary diagnosis]").
        10. Plan: Formulate a 5-10 point evidence-based clinical management plan, ranging from immediate stabilization and further investigations to definitive intervention and follow-up.
        11. References: Provide 4-5 high-impact academic references (e.g., NEJM, Lancet, specialized journals) in standard Vancouver or AMA format.
        
        Handling Missing Data & Edge Cases:
        - If specific clinical details are absent from the input, DO NOT hallucinate. Use professional language like "Not documented at presentation," "Further clinical correlation required," or "Records regarding [system] were unavailable."
        - If examination findings are sparse, the "Examination Narrative" should reflect this, and the "Plan" MUST prioritize "Comprehensive physical and systemic examination" as the first step.
        
        Return the response in JSON format with the following structure:
        {
          "hpcNarrative": "...",
          "rosNarrative": "...",
          "pmhNarrative": "...",
          "pshNarrative": "...",
          "fshNarrative": "...",
          "examinationNarrative": "...",
          "differentials": [
            { "diagnosis": "...", "reasoning": "..." }
          ],
          "impression": "...",
          "plan": ["..."],
          "caseDiscussionSections": [
            { "title": "...", "content": "..." }
          ],
          "references": ["..."]
        }
      `;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { 
          responseMimeType: "application/json",
          temperature: 0.7,
        }
      });

      let storyData;
      try {
        const text = response.text;
        if (!text) throw new Error("Empty response from AI");
        storyData = JSON.parse(text);
        
        // Basic validation of required fields
        const requiredFields = ['hpcNarrative', 'rosNarrative', 'impression', 'plan'];
        const missingFields = requiredFields.filter(f => !storyData[f]);
        if (missingFields.length > 0) {
          console.warn("AI response missing fields:", missingFields);
          storyData = { ...fallbackData, ...storyData };
        }
      } catch (e) {
        console.error("AI Output Parsing Error:", e);
        storyData = fallbackData;
      }
      
      // Save report automatically if user is logged in
      if (user) {
        await handleSaveReport(storyData, 'story');
      }

      setGenerationStatus("Compiling story into high-level PDF...");
      const reportTitle = storyData.impression || formData.chiefComplaint || 'Clinical Case';
      const blob = await pdf(<SurgicalCaseWriteUpPDF formData={formData} storyData={storyData} title={reportTitle} />).toBlob();
      triggerDownload(blob, `Surgical_Case_WriteUp_${formData.fullName || 'Patient'}`);
      setStoryReportStatus('completed');
      setTimeout(() => setStoryReportStatus('idle'), 3000);
    } catch (error: any) {
      console.error("Story Generation Error:", error);
      setStoryReportStatus('error');
      
      // Generate PDF with fallback data even on top-level catch
      try {
        const blob = await pdf(<SurgicalCaseWriteUpPDF formData={formData} storyData={fallbackData} />).toBlob();
        triggerDownload(blob, `Surgical_Case_WriteUp_${formData.fullName || 'Patient'}_FALLBACK`);
        setStoryReportStatus('completed'); // Fallback is still a success of sorts
        setTimeout(() => setStoryReportStatus('idle'), 3000);
      } catch (pdfError) {
        console.error("Fallback PDF Error:", pdfError);
        setStoryReportStatus('error');
      }
    }
  };

  const triggerDownload = (blob: Blob, baseName: string) => {
    const fileName = `${baseName}_${new Date().getTime()}.pdf`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  };

  const handleNext = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setCompletedSteps(prev => new Set(prev).add(currentStep.id));
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleReset = () => {
    setShowConfirmModal({
      show: true,
      title: 'Reset Session',
      message: 'Are you sure you want to reset the session? All current patient data will be lost.',
      onConfirm: () => {
        setFormData({});
        localStorage.removeItem('malae_form_data');
        setCurrentStepIndex(0);
        setCompletedSteps(new Set());
        setGeneratorMode('selection');
        setShowConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  };

  const updateField = (field: string, value: any) => {
    if (typeof value === 'function') {
      setFormData((prev: any) => ({ ...prev, [field]: value(prev[field]) }));
    } else {
      setFormData((prev: any) => ({ ...prev, [field]: value }));
    }
  };

  const renderStepContent = (stepId: StepId) => {
    switch (stepId) {
      case 'specialty':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SPECIALTIES.map((spec) => (
              <button
                key={spec}
                onClick={() => {
                  setFormData((prev: any) => ({ ...prev, specialty: spec }));
                  handleNext();
                }}
                className={`p-6 rounded-2xl border-2 transition-all text-left flex flex-col gap-2 group ${formData.specialty === spec ? 'border-[#AE6965] bg-[#AE6965]/5' : 'border-slate-50 bg-slate-50/30 hover:border-slate-200'}`}
              >
                <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${formData.specialty === spec ? 'text-[#AE6965]' : 'text-slate-400 group-hover:text-slate-600'}`}>Department</span>
                <span className={`text-lg font-black transition-colors ${formData.specialty === spec ? 'text-slate-900' : 'text-slate-700'}`}>{spec}</span>
              </button>
            ))}
          </div>
        );
      case 'demographics':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField label="Date of Admission" type="date" value={formData.admissionDate} onChange={(v: any) => updateField('admissionDate', v)} required />
            <InputField label="Patient Initials" placeholder="J.D" value={formData.fullName} onChange={(v: any) => updateField('fullName', v)} required onVoiceInput={() => startVoiceInput('fullName')} isRecording={recordingField === 'fullName'} isTranscribing={transcribingField === 'fullName'} recordingTimeLeft={recordingTimeLeft} />
            <SelectField 
              label="Age (years)" 
              options={Array.from({ length: 121 }, (_, i) => i.toString())} 
              value={formData.age} 
              onChange={(v: any) => updateField('age', v)} 
              required 
            />
            <SelectField 
              label="Sex" 
              options={['Male', 'Female', 'Other']} 
              value={formData.sex} 
              onChange={(v: any) => updateField('sex', v)} 
              required 
            />
            <SelectField 
              label="Tribe/Ethnicity" 
              options={['Kikuyu', 'Luhya', 'Luo', 'Kalenjin', 'Kamba', 'Meru', 'Kisii', 'Mijikenda', 'Somali', 'Other']} 
              value={formData.ethnicity} 
              onChange={(v: any) => updateField('ethnicity', v)} 
            />
            <InputField label="Address/Location" placeholder="Nairobi" value={formData.address} onChange={(v: any) => updateField('address', v)} onVoiceInput={() => startVoiceInput('address')} isRecording={recordingField === 'address'} isTranscribing={transcribingField === 'address'} recordingTimeLeft={recordingTimeLeft} />
            <SelectField 
              label="Religion" 
              options={['Christian', 'Muslim', 'Hindu', 'Traditional', 'None', 'Other']} 
              value={formData.religion} 
              onChange={(v: any) => updateField('religion', v)} 
            />
            <InputField label="Occupation" placeholder="Teacher" value={formData.occupation} onChange={(v: any) => updateField('occupation', v)} onVoiceInput={() => startVoiceInput('occupation')} isRecording={recordingField === 'occupation'} isTranscribing={transcribingField === 'occupation'} recordingTimeLeft={recordingTimeLeft} />
            <InputField label="Next of Kin (Initials)" placeholder="J.D" value={formData.nextOfKin} onChange={(v: any) => updateField('nextOfKin', v)} onVoiceInput={() => startVoiceInput('nextOfKin')} isRecording={recordingField === 'nextOfKin'} isTranscribing={transcribingField === 'nextOfKin'} recordingTimeLeft={recordingTimeLeft} />
            <InputField label="Relationship" placeholder="Spouse" value={formData.relationship} onChange={(v: any) => updateField('relationship', v)} onVoiceInput={() => startVoiceInput('relationship')} isRecording={recordingField === 'relationship'} isTranscribing={transcribingField === 'relationship'} recordingTimeLeft={recordingTimeLeft} />
          </div>
        );
      case 'presenting_complaint':
        return (
          <div className="flex flex-col gap-8">
            <TextAreaField label="Chief Complaint" placeholder="e.g., Neck swelling, Epigastric pain" value={formData.chiefComplaint} onChange={(v: any) => updateField('chiefComplaint', v)} required onVoiceInput={() => startVoiceInput('chiefComplaint')} isRecording={recordingField === 'chiefComplaint'} isTranscribing={transcribingField === 'chiefComplaint'} recordingTimeLeft={recordingTimeLeft} />
            <InputField label="Duration" placeholder="e.g., 1 year, 2 months" value={formData.duration} onChange={(v: any) => updateField('duration', v)} required onVoiceInput={() => startVoiceInput('duration')} isRecording={recordingField === 'duration'} isTranscribing={transcribingField === 'duration'} recordingTimeLeft={recordingTimeLeft} />
          </div>
        );
      case 'hpc_details':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField label="Onset" placeholder="sudden/gradual/insidious" value={formData.onset} onChange={(v: any) => updateField('onset', v)} onVoiceInput={() => startVoiceInput('onset')} isRecording={recordingField === 'onset'} isTranscribing={transcribingField === 'onset'} recordingTimeLeft={recordingTimeLeft} />
            <InputField label="Progression" placeholder="progressive/static/improving" value={formData.progression} onChange={(v: any) => updateField('progression', v)} onVoiceInput={() => startVoiceInput('progression')} isRecording={recordingField === 'progression'} isTranscribing={transcribingField === 'progression'} recordingTimeLeft={recordingTimeLeft} />
            <InputField label="Character" placeholder="sharp, dull, burning, aching" value={formData.character} onChange={(v: any) => updateField('character', v)} onVoiceInput={() => startVoiceInput('character')} isRecording={recordingField === 'character'} isTranscribing={transcribingField === 'character'} recordingTimeLeft={recordingTimeLeft} />
            <InputField label="Severity" placeholder="mild/moderate/severe or 1-10" value={formData.severity} onChange={(v: any) => updateField('severity', v)} onVoiceInput={() => startVoiceInput('severity')} isRecording={recordingField === 'severity'} isTranscribing={transcribingField === 'severity'} recordingTimeLeft={recordingTimeLeft} />
            <InputField label="Location" placeholder="exact anatomical location" value={formData.location} onChange={(v: any) => updateField('location', v)} onVoiceInput={() => startVoiceInput('location')} isRecording={recordingField === 'location'} isTranscribing={transcribingField === 'location'} recordingTimeLeft={recordingTimeLeft} />
            <InputField label="Radiation" placeholder="where symptoms radiate" value={formData.radiation} onChange={(v: any) => updateField('radiation', v)} onVoiceInput={() => startVoiceInput('radiation')} isRecording={recordingField === 'radiation'} isTranscribing={transcribingField === 'radiation'} recordingTimeLeft={recordingTimeLeft} />
            <div className="md:col-span-2">
              <TextAreaField label="Associated Symptoms (Present)" placeholder="fever, weight loss, night sweats, cough, etc." value={formData.associatedSymptoms} onChange={(v: any) => updateField('associatedSymptoms', v)} onVoiceInput={() => startVoiceInput('associatedSymptoms')} isRecording={recordingField === 'associatedSymptoms'} isTranscribing={transcribingField === 'associatedSymptoms'} recordingTimeLeft={recordingTimeLeft} />
            </div>
            <div className="md:col-span-2">
              <TextAreaField label="Important Negative Findings" placeholder="symptoms NOT present that help rule out differentials" value={formData.negativeFindings} onChange={(v: any) => updateField('negativeFindings', v)} onVoiceInput={() => startVoiceInput('negativeFindings')} isRecording={recordingField === 'negativeFindings'} isTranscribing={transcribingField === 'negativeFindings'} recordingTimeLeft={recordingTimeLeft} />
            </div>
            <InputField label="Aggravating Factors" placeholder="lying flat, spicy foods, movement" value={formData.aggravating} onChange={(v: any) => updateField('aggravating', v)} onVoiceInput={() => startVoiceInput('aggravating')} isRecording={recordingField === 'aggravating'} isTranscribing={transcribingField === 'aggravating'} recordingTimeLeft={recordingTimeLeft} />
            <InputField label="Relieving Factors" placeholder="rest, medication, position" value={formData.relieving} onChange={(v: any) => updateField('relieving', v)} onVoiceInput={() => startVoiceInput('relieving')} isRecording={recordingField === 'relieving'} isTranscribing={transcribingField === 'relieving'} recordingTimeLeft={recordingTimeLeft} />
            <InputField label="Previous Treatment" placeholder="medications tried" value={formData.prevTreatment} onChange={(v: any) => updateField('prevTreatment', v)} onVoiceInput={() => startVoiceInput('prevTreatment')} isRecording={recordingField === 'prevTreatment'} isTranscribing={transcribingField === 'prevTreatment'} recordingTimeLeft={recordingTimeLeft} />
            <InputField label="Response to Treatment" placeholder="improvement/no change/worsening" value={formData.respTreatment} onChange={(v: any) => updateField('respTreatment', v)} onVoiceInput={() => startVoiceInput('respTreatment')} isRecording={recordingField === 'respTreatment'} isTranscribing={transcribingField === 'respTreatment'} recordingTimeLeft={recordingTimeLeft} />
            <div className="md:col-span-2">
              <TextAreaField label="Impact on Daily Activities" placeholder="how symptoms affect daily life" value={formData.impact} onChange={(v: any) => updateField('impact', v)} onVoiceInput={() => startVoiceInput('impact')} isRecording={recordingField === 'impact'} isTranscribing={transcribingField === 'impact'} recordingTimeLeft={recordingTimeLeft} />
            </div>
          </div>
        );
      case 'review_of_systems':
        return (
          <div className="flex flex-col gap-8">
            {['GENERAL', 'CARDIOVASCULAR', 'RESPIRATORY', 'GASTROINTESTINAL'].map(system => (
              <div key={system} className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#AE6965]" />
                  <span className="text-[10px] font-bold text-slate-700 tracking-widest">{system}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField label="Symptoms Present" value={formData[`${system}_present`]} onChange={(v: any) => updateField(`${system}_present`, v)} onVoiceInput={() => startVoiceInput(`${system}_present`)} isRecording={recordingField === `${system}_present`} isTranscribing={transcribingField === `${system}_present`} recordingTimeLeft={recordingTimeLeft} />
                  <InputField label="Symptoms Denied" value={formData[`${system}_denied`]} onChange={(v: any) => updateField(`${system}_denied`, v)} onVoiceInput={() => startVoiceInput(`${system}_denied`)} isRecording={recordingField === `${system}_denied`} isTranscribing={transcribingField === `${system}_denied`} recordingTimeLeft={recordingTimeLeft} />
                </div>
              </div>
            ))}
          </div>
        );
      case 'past_medical_hx':
        return (
          <div className="flex flex-col gap-8">
            <TextAreaField label="Chronic Medical Conditions" value={formData.chronicConditions} onChange={(v: any) => updateField('chronicConditions', v)} onVoiceInput={() => startVoiceInput('chronicConditions')} isRecording={recordingField === 'chronicConditions'} isTranscribing={transcribingField === 'chronicConditions'} recordingTimeLeft={recordingTimeLeft} />
            <TextAreaField label="Current Pharmacotherapy" value={formData.medications} onChange={(v: any) => updateField('medications', v)} onVoiceInput={() => startVoiceInput('medications')} isRecording={recordingField === 'medications'} isTranscribing={transcribingField === 'medications'} recordingTimeLeft={recordingTimeLeft} />
            <TextAreaField label="Allergies & Hypersensitivities" value={formData.allergies} onChange={(v: any) => updateField('allergies', v)} onVoiceInput={() => startVoiceInput('allergies')} isRecording={recordingField === 'allergies'} isTranscribing={transcribingField === 'allergies'} recordingTimeLeft={recordingTimeLeft} />
            <FileUpload 
              label="Supporting Records" 
              subtitle="UPLOAD LAB RESULTS OR CLINICAL NOTES" 
              onFileSelect={handleFileProcessing}
              isProcessing={isProcessingFile}
            />
          </div>
        );
      case 'past_surgical_hx':
        return (
          <div className="flex flex-col gap-8">
            <TextAreaField label="Previous Surgeries" placeholder="Appendectomy 2015, etc." value={formData.surgeries} onChange={(v: any) => updateField('surgeries', v)} onVoiceInput={() => startVoiceInput('surgeries')} isRecording={recordingField === 'surgeries'} isTranscribing={transcribingField === 'surgeries'} recordingTimeLeft={recordingTimeLeft} />
            <InputField label="Major Trauma/Fractures" placeholder="Describe any major injuries" value={formData.trauma} onChange={(v: any) => updateField('trauma', v)} onVoiceInput={() => startVoiceInput('trauma')} isRecording={recordingField === 'trauma'} isTranscribing={transcribingField === 'trauma'} recordingTimeLeft={recordingTimeLeft} />
            <InputField label="Blood Transfusion History" placeholder="Yes/No, if yes when and why" value={formData.transfusions} onChange={(v: any) => updateField('transfusions', v)} onVoiceInput={() => startVoiceInput('transfusions')} isRecording={recordingField === 'transfusions'} isTranscribing={transcribingField === 'transfusions'} recordingTimeLeft={recordingTimeLeft} />
          </div>
        );
      case 'family_social_hx':
        return (
          <div className="flex flex-col gap-8">
            <TextAreaField label="Familial Health Patterns" value={formData.familyHistory} onChange={(v: any) => updateField('familyHistory', v)} onVoiceInput={() => startVoiceInput('familyHistory')} isRecording={recordingField === 'familyHistory'} isTranscribing={transcribingField === 'familyHistory'} recordingTimeLeft={recordingTimeLeft} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SelectField label="Alcohol Consumption" options={['None', 'Social', 'Heavy']} value={formData.alcohol} onChange={(v: any) => updateField('alcohol', v)} />
              <SelectField label="Tobacco Consumption" options={['None', 'Occasional', 'Regular']} value={formData.tobacco} onChange={(v: any) => updateField('tobacco', v)} />
              <InputField label="Current Marital Status" value={formData.maritalStatus} onChange={(v: any) => updateField('maritalStatus', v)} onVoiceInput={() => startVoiceInput('maritalStatus')} isRecording={recordingField === 'maritalStatus'} isTranscribing={transcribingField === 'maritalStatus'} recordingTimeLeft={recordingTimeLeft} />
              <InputField label="Household Dependents" value={formData.dependents} onChange={(v: any) => updateField('dependents', v)} onVoiceInput={() => startVoiceInput('dependents')} isRecording={recordingField === 'dependents'} isTranscribing={transcribingField === 'dependents'} recordingTimeLeft={recordingTimeLeft} />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row font-sans text-slate-900 overflow-x-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 lg:w-72 bg-[#FDFCFB] border-r border-slate-100 flex-col h-screen sticky top-0 shrink-0">
        <div className="p-8 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center text-white shadow-sm">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-2xl text-slate-900 leading-none uppercase tracking-widest">Malae</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Clinical Workspace</span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 flex flex-col gap-1 overflow-y-auto no-scrollbar">
          <div className="px-4 py-3">
            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.2em]">Navigation</span>
          </div>
          <button
            onClick={() => setView('dashboard')}
            className={`
              flex items-center gap-4 px-4 py-3 rounded-xl transition-all group
              ${view === 'dashboard' ? 'bg-white text-[#AE6965] shadow-sm border border-slate-100' : 'text-slate-500 hover:bg-slate-50'}
            `}
          >
            <LayoutDashboard className={`w-4 h-4 transition-colors ${view === 'dashboard' ? 'text-[#AE6965]' : 'text-slate-400 group-hover:text-slate-600'}`} />
            <span className="text-[11px] font-bold uppercase tracking-widest">My Cases</span>
          </button>

          <button
            onClick={() => setView('profile')}
            className={`
              flex items-center gap-4 px-4 py-3 rounded-xl transition-all group
              ${view === 'profile' ? 'bg-white text-[#AE6965] shadow-sm border border-slate-100' : 'text-slate-500 hover:bg-slate-50'}
            `}
          >
            <UserIcon className={`w-4 h-4 transition-colors ${view === 'profile' ? 'text-[#AE6965]' : 'text-slate-400 group-hover:text-slate-600'}`} />
            <span className="text-[11px] font-bold uppercase tracking-widest">My Profile</span>
          </button>

          {view === 'generator' && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="mt-6 space-y-1"
            >
              <div className="px-4 py-3">
                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.2em]">Case Progress</span>
              </div>
              {STEPS.map((step, index) => {
                const isActive = currentStepIndex === index;
                const isCompleted = completedSteps.has(step.id);
                const Icon = step.icon;

                return (
                  <button
                    key={step.id}
                    onClick={() => setCurrentStepIndex(index)}
                    className={`
                      w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all group relative
                      ${isActive ? 'bg-white text-[#AE6965] shadow-sm border border-slate-100' : 'text-slate-500 hover:bg-slate-50'}
                    `}
                  >
                    <div className={`
                      w-6 h-6 rounded-lg flex items-center justify-center transition-all
                      ${isActive ? 'bg-[#AE6965] text-white' : isCompleted ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-100 text-slate-400'}
                    `}>
                      {isCompleted && !isActive ? <CheckCircle2 className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${isActive ? 'text-[#AE6965]' : 'text-slate-500'}`}>
                      {step.label}
                    </span>
                  </button>
                );
              })}
            </motion.div>
          )}
        </nav>

        <div className="p-6 border-t border-slate-50 space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-50">
            <div className="w-10 h-10 rounded-lg bg-[#AE6965] flex items-center justify-center text-white font-bold text-xs">
              {user.displayName?.[0] || user.email?.[0].toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold text-slate-800 truncate uppercase tracking-widest">{user.displayName || 'Physician'}</span>
              <span className="text-[9px] text-slate-400 truncate font-medium">{user.email}</span>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all font-bold text-[10px] uppercase tracking-widest"
          >
            <LogOut className="w-4 h-4" />
            SIGN OUT
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] md:hidden"
            />
            <motion.aside 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-[85%] max-w-[300px] bg-white z-[70] flex flex-col shadow-2xl md:hidden rounded-r-3xl overflow-hidden"
            >
              <div className="p-6 flex items-center justify-between border-b border-slate-50 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#AE6965] flex items-center justify-center text-white shadow-lg shadow-[#AE6965]/20">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-black text-slate-900 tracking-tighter text-xl uppercase tracking-widest leading-none">Malae</span>
                    <span className="text-[8px] font-black text-[#AE6965] uppercase tracking-[0.2em] mt-1">Clinical Workspace</span>
                  </div>
                </div>
                <button 
                  onClick={() => setIsSidebarOpen(false)} 
                  className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-white rounded-xl transition-all shadow-sm border border-transparent hover:border-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 px-4 py-8 flex flex-col gap-2 overflow-y-auto no-scrollbar">
                <button
                  onClick={() => { setView('dashboard'); setIsSidebarOpen(false); }}
                  className={`
                    flex items-center gap-4 px-5 py-4 rounded-2xl transition-all group
                    ${view === 'dashboard' ? 'bg-[#AE6965] text-white shadow-xl shadow-[#AE6965]/20' : 'text-slate-500 hover:bg-slate-50'}
                  `}
                >
                  <div className={`
                    w-9 h-9 rounded-xl flex items-center justify-center transition-colors
                    ${view === 'dashboard' ? 'bg-white/20' : 'bg-slate-100 text-slate-400'}
                  `}>
                    <LayoutDashboard className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-widest">My Cases</span>
                </button>

                <button
                  onClick={() => { setView('profile'); setIsSidebarOpen(false); }}
                  className={`
                    flex items-center gap-4 px-5 py-4 rounded-2xl transition-all group
                    ${view === 'profile' ? 'bg-[#AE6965] text-white shadow-xl shadow-[#AE6965]/20' : 'text-slate-500 hover:bg-slate-50'}
                  `}
                >
                  <div className={`
                    w-9 h-9 rounded-xl flex items-center justify-center transition-colors
                    ${view === 'profile' ? 'bg-white/20' : 'bg-slate-100 text-slate-400'}
                  `}>
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-widest">My Profile</span>
                </button>

                {view === 'generator' && (
                  <div className="mt-6 space-y-1">
                    <div className="px-5 py-2">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Case Progress</span>
                    </div>
                    {STEPS.map((step, index) => {
                      const isActive = currentStepIndex === index;
                      const isCompleted = completedSteps.has(step.id);
                      const Icon = step.icon;

                      return (
                        <button
                          key={step.id}
                          onClick={() => {
                            setCurrentStepIndex(index);
                            setIsSidebarOpen(false);
                          }}
                          className={`
                            w-full flex items-center gap-4 px-5 py-3 rounded-xl transition-all group
                            ${isActive ? 'bg-[#AE6965]/5 text-[#AE6965]' : 'text-slate-500 hover:bg-slate-50'}
                          `}
                        >
                          <div className={`
                            w-7 h-7 rounded-lg flex items-center justify-center transition-all
                            ${isActive ? 'bg-[#AE6965] text-white shadow-md' : isCompleted ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-100 text-slate-400'}
                          `}>
                            {isCompleted && !isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                          </div>
                          <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-[#AE6965]' : 'text-slate-500'}`}>
                            {step.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </nav>

              <div className="p-6 border-t border-slate-50 space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50">
                  <div className="w-9 h-9 rounded-full bg-[#AE6965] flex items-center justify-center text-white font-black text-xs shadow-sm">
                    {user.displayName?.[0] || user.email?.[0].toUpperCase()}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-black text-slate-800 truncate uppercase tracking-widest">{user.displayName || 'Physician'}</span>
                    <span className="text-[8px] text-slate-400 truncate font-medium">{user.email}</span>
                  </div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl text-red-500 bg-red-50 hover:bg-red-100 transition-all font-black text-[10px] uppercase tracking-widest"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  SIGN OUT
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        {/* Mobile Header */}
        <header className="md:hidden h-16 bg-white border-b border-slate-100 px-4 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 text-slate-400 hover:text-slate-900 transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <span className="font-black text-slate-900 tracking-tighter text-lg uppercase tracking-widest">Malae</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#AE6965] flex items-center justify-center text-white font-black text-[10px]">
            {user.displayName?.[0] || user.email?.[0].toUpperCase()}
          </div>
        </header>
        {view === 'dashboard' ? (
          <div className="flex-1 overflow-y-auto">
            <Dashboard 
              onNewReport={() => {
                setFormData({});
                setCurrentStepIndex(0);
                setCompletedSteps(new Set());
                setGeneratorMode('selection');
                setView('generator');
              }}
              onViewReport={(report) => {
                setSelectedReport(report);
                setView('viewer');
              }}
              onConfirmDelete={(onConfirm) => {
                setShowConfirmModal({
                  show: true,
                  title: 'Delete Record',
                  message: 'Are you sure you want to permanently delete this clinical record?',
                  onConfirm: () => {
                    onConfirm();
                    setShowConfirmModal(prev => ({ ...prev, show: false }));
                  }
                });
              }}
            />
          </div>
        ) : view === 'profile' ? (
          <div className="flex-1 overflow-y-auto">
            <Profile onBack={() => setView('dashboard')} />
          </div>
        ) : view === 'viewer' ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-10">
            <div className="max-w-4xl mx-auto">
              <button 
                onClick={() => setView('dashboard')}
                className="flex items-center gap-2 text-slate-500 hover:text-[#AE6965] font-black text-[10px] sm:text-xs md:text-sm mb-4 sm:mb-6 transition-colors group"
              >
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span className="uppercase tracking-widest">Back to My Cases</span>
              </button>
              
              <div className="bg-white rounded-[2rem] sm:rounded-[32px] p-6 sm:p-8 md:p-12 shadow-sm border border-slate-100">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 sm:mb-12 pb-8 sm:pb-12 border-b border-slate-50">
                  <div className="space-y-2">
                    <h1 className="text-xl sm:text-3xl font-black text-slate-900 leading-tight">{selectedReport.title}</h1>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-[10px] sm:text-sm text-slate-500 font-medium flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        {selectedReport.createdAt?.toDate ? selectedReport.createdAt.toDate().toLocaleDateString() : 'Recently'}
                      </p>
                      <span className={`text-[8px] sm:text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-[0.15em] border ${
                        selectedReport.type === 'story' 
                          ? 'bg-[#AE6965]/5 text-[#AE6965] border-[#AE6965]/20' 
                          : 'bg-slate-50 text-slate-500 border-slate-200'
                      }`}>
                        {selectedReport.type === 'story' ? 'Case Story' : 'Case Details'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button 
                      onClick={async () => {
                        const blob = await pdf(<MedicalReportPDF formData={selectedReport.patientData} />).toBlob();
                        triggerDownload(blob, `Clinical_Report_${selectedReport.patientData.fullName || 'Patient'}`);
                      }}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-[10px] hover:bg-slate-200 transition-all"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span className="uppercase tracking-widest">Original Report</span>
                    </button>

                    <button 
                      onClick={async () => {
                        if (selectedReport.type === 'story') {
                          const blob = await pdf(<ClinicalCaseStoryPDF formData={selectedReport.patientData} storyData={selectedReport.reportData} />).toBlob();
                          triggerDownload(blob, `Case_Story_${selectedReport.patientData.fullName || 'Patient'}`);
                        } else {
                          alert("This is a clinical record. Generate a Case Story first to access AI-Assisted Compilation.");
                        }
                      }}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#AE6965] text-white font-bold text-[10px] hover:bg-[#8E5450] transition-all shadow-lg shadow-[#AE6965]/10"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span className="uppercase tracking-widest">AI Compilation</span>
                    </button>

                    <button 
                      onClick={() => {
                        if (selectedReport.type === 'story') {
                          generatePPT(selectedReport.patientData, selectedReport.reportData);
                        } else {
                          alert("Generate a Case Story first to create a PowerPoint presentation.");
                        }
                      }}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-900 text-white font-bold text-[10px] hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span className="uppercase tracking-widest">PowerPoint</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-8 sm:space-y-12">
                  {selectedReport.type === 'story' ? (
                    <>
                      <section>
                        <h2 className="text-base sm:text-xl font-black text-slate-900 mb-4 flex items-center gap-3">
                          <div className="w-1.5 sm:w-2 h-6 sm:h-8 bg-[#AE6965] rounded-full" />
                          Case Summary
                        </h2>
                        <p className="text-slate-600 leading-relaxed text-sm sm:text-lg font-medium">{selectedReport.reportData.hpcNarrative}</p>
                      </section>

                      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
                        <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-50 border border-slate-100">
                          <h3 className="font-black text-slate-900 mb-3 uppercase text-[9px] sm:text-[10px] tracking-widest">Clinical Impression</h3>
                          <p className="text-sm sm:text-base text-slate-700 font-bold">{selectedReport.reportData.impression}</p>
                        </div>
                        <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-50 border border-slate-100">
                          <h3 className="font-black text-slate-900 mb-3 uppercase text-[9px] sm:text-[10px] tracking-widest">Management Plan</h3>
                          <ul className="space-y-2">
                            {selectedReport.reportData.plan?.map((item: string, i: number) => (
                              <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-slate-600 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0 mt-0.5" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </section>

                      <section>
                        <h2 className="text-base sm:text-xl font-black text-slate-900 mb-6">Possible Diagnoses</h2>
                        <div className="space-y-3 sm:space-y-4">
                          {selectedReport.reportData.differentials?.map((diff: any, i: number) => (
                            <div key={i} className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 hover:border-[#AE6965]/30 transition-colors bg-white shadow-sm">
                              <h4 className="font-black text-sm sm:text-base text-slate-900 mb-2 tracking-tight">{i + 1}. {diff.diagnosis}</h4>
                              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-medium">{diff.reasoning}</p>
                            </div>
                          ))}
                        </div>
                      </section>
                    </>
                  ) : (
                    <div className="space-y-8">
                      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                          <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Patient Name</p>
                          <p className="text-sm font-black text-slate-900">{selectedReport.patientData.fullName || 'Not recorded'}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                          <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Chief Complaint</p>
                          <p className="text-sm font-black text-slate-900">{selectedReport.patientData.chiefComplaint || 'Not recorded'}</p>
                        </div>
                      </section>
                      
                      <section>
                        <h2 className="text-base sm:text-lg font-black text-slate-900 mb-4">Clinical History</h2>
                        <div className="space-y-4">
                          <div className="p-4 rounded-xl border border-slate-100">
                            <h4 className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">History of Presenting Illness</h4>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap font-medium">{selectedReport.patientData.hpi || 'No data recorded'}</p>
                          </div>
                          <div className="p-4 rounded-xl border border-slate-100">
                            <h4 className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Past Medical History</h4>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap font-medium">{selectedReport.patientData.pmh || 'No data recorded'}</p>
                          </div>
                        </div>
                      </section>

                      <div className="p-6 sm:p-8 rounded-[2rem] bg-[#AE6965]/5 border border-[#AE6965]/10 text-center">
                        <Sparkles className="w-8 h-8 text-[#AE6965] mx-auto mb-3" />
                        <h4 className="font-black text-slate-900 mb-2">Write a case story?</h4>
                        <p className="text-xs text-slate-500 mb-6 font-medium">Create a professional narrative summary from these details.</p>
                          <button 
                            onClick={() => {
                              setFormData(selectedReport.patientData);
                              setCurrentStepIndex(0);
                              setCompletedSteps(new Set(STEPS.map(s => s.id))); // Mark all as done
                              setView('generator');
                            }}
                            className="px-8 py-3 rounded-xl bg-[#AE6965] text-white text-xs font-black hover:bg-[#8E5450] transition-all shadow-lg shadow-[#AE6965]/20 uppercase tracking-widest"
                          >
                            History write up with AI
                          </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 sm:px-10 py-4 sm:py-6 flex items-center justify-between">
              <div className="flex items-center gap-4 sm:gap-6">
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="md:hidden p-2.5 -ml-1 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all active:scale-95"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <div className="flex flex-col">
                  <h2 className="text-lg sm:text-2xl font-black text-slate-900 uppercase tracking-widest">
                    Case Story Generator
                  </h2>
                  <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
                    Step {currentStepIndex + 1} of {STEPS.length}: {STEPS[currentStepIndex].title}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:gap-6">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-[11px] font-bold text-slate-900 uppercase tracking-widest">{auth.currentUser?.displayName || 'Healthcare Professional'}</span>
                  <span className="text-[9px] font-bold text-[#AE6965] uppercase tracking-widest">Clinical Workspace</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                  {(auth.currentUser?.displayName || 'H').charAt(0).toUpperCase()}
                </div>
              </div>
            </header>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-10 py-6 sm:py-8 md:py-12">
              <div className="max-w-4xl mx-auto">
                <AnimatePresence mode="wait">
                  {generatorMode === 'selection' ? (
                    <motion.div
                      key="selection"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="flex flex-col gap-6 sm:gap-8 md:gap-10"
                    >
                      <div className="flex flex-col gap-4 text-center md:text-left">
                        <h2 className="text-4xl sm:text-5xl md:text-7xl font-black text-slate-900 leading-tight uppercase tracking-widest">Start New Case</h2>
                        <p className="text-sm sm:text-base md:text-xl text-slate-400 font-medium">Choose your preferred method of clinical data entry.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <button 
                          onClick={() => setGeneratorMode('form')}
                          className="group p-10 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-xl transition-all flex flex-col items-center text-center gap-8 relative overflow-hidden active:scale-[0.98]"
                        >
                          <div className="w-20 h-20 rounded-xl bg-slate-50 text-slate-300 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-all duration-500">
                            <ClipboardList className="w-10 h-10" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-slate-900 mb-3 uppercase tracking-widest group-hover:text-[#AE6965] transition-colors">Direct Form</h3>
                            <p className="text-xs text-slate-400 leading-relaxed font-medium">Enter case details manually using our structured clinical form.</p>
                          </div>
                          <div className="mt-auto flex items-center gap-2 text-[#AE6965] font-bold text-[10px] opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                            <span className="uppercase tracking-widest">Proceed</span> <ChevronRight className="w-4 h-4" />
                          </div>
                        </button>

                        <button 
                          onClick={() => setGeneratorMode('upload')}
                          className="group p-10 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-xl transition-all flex flex-col items-center text-center gap-8 relative overflow-hidden active:scale-[0.98]"
                        >
                          <div className="w-20 h-20 rounded-xl bg-slate-50 text-slate-300 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-all duration-500">
                            <FileUp className="w-10 h-10" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-slate-900 mb-3 uppercase tracking-widest group-hover:text-[#AE6965] transition-colors">Document Upload</h3>
                            <p className="text-xs text-slate-400 leading-relaxed font-medium">Upload a PDF or image of clinical notes to extract data automatically.</p>
                          </div>
                          <div className="mt-auto flex items-center gap-2 text-[#AE6965] font-bold text-[10px] opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                            <span className="uppercase tracking-widest">Upload File</span> <ChevronRight className="w-4 h-4" />
                          </div>
                        </button>

                        <button 
                          onClick={() => setGeneratorMode('audio')}
                          className="group p-10 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-xl transition-all flex flex-col items-center text-center gap-8 relative overflow-hidden active:scale-[0.98]"
                        >
                          <div className="w-20 h-20 rounded-xl bg-slate-50 text-slate-300 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-all duration-500">
                            <Mic className="w-10 h-10" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-slate-900 mb-3 uppercase tracking-widest group-hover:text-[#AE6965] transition-colors">Audio Input</h3>
                            <p className="text-xs text-slate-400 leading-relaxed font-medium">Dictate the case details and let AI transcribe and organize the data.</p>
                          </div>
                          <div className="mt-auto flex items-center gap-2 text-[#AE6965] font-bold text-[10px] opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                            <span className="uppercase tracking-widest">Start Recording</span> <ChevronRight className="w-4 h-4" />
                          </div>
                        </button>
                      </div>
                    </motion.div>
                  ) : generatorMode === 'upload' ? (
                    <motion.div
                      key="upload"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex flex-col gap-6 sm:gap-8 max-w-2xl mx-auto"
                    >
                      <button 
                        onClick={() => setGeneratorMode('selection')}
                        className="flex items-center gap-2 text-slate-400 hover:text-[#AE6965] font-bold text-[10px] sm:text-xs transition-colors self-start"
                      >
                        <ChevronLeft className="w-3.5 h-3.5 sm:w-4 h-4" />
                        BACK TO OPTIONS
                      </button>
                      
                      <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] p-8 sm:p-12 shadow-sm border border-slate-100 text-center">
                        <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl bg-[#AE6965]/5 text-[#AE6965] flex items-center justify-center mx-auto mb-6 sm:mb-8">
                          <FileUp className="w-8 h-8 sm:w-12 sm:h-12" />
                        </div>
                        <h2 className="text-xl sm:text-3xl font-black text-slate-900 mb-2 sm:mb-4">Upload Clinical Document</h2>
                        <p className="text-xs sm:text-base text-slate-500 mb-8 sm:mb-10 leading-relaxed">Select a PDF or image file (clinical notes, lab results, etc.) to extract patient data.</p>
                        
                        <FileUpload 
                          label={isProcessingFile ? "Processing Document..." : "Select Document"}
                          subtitle="PDF OR IMAGE (MAX 10MB)"
                          onFileSelect={handleFullCaseFileProcessing}
                          isProcessing={isProcessingFile}
                        />
                      </div>
                    </motion.div>
                  ) : generatorMode === 'audio' ? (
                    <motion.div
                      key="audio"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex flex-col gap-6 sm:gap-8 max-w-2xl mx-auto"
                    >
                      <button 
                        onClick={() => setGeneratorMode('selection')}
                        className="flex items-center gap-2 text-slate-400 hover:text-[#AE6965] font-bold text-[10px] sm:text-xs transition-colors self-start"
                      >
                        <ChevronLeft className="w-3.5 h-3.5 sm:w-4 h-4" />
                        BACK TO OPTIONS
                      </button>
                      
                      <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] p-8 sm:p-12 shadow-sm border border-slate-100 text-center">
                        <div className={`w-16 h-16 sm:w-24 sm:h-24 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8 transition-all duration-500 ${isRecording ? 'bg-red-500 text-white animate-pulse shadow-2xl shadow-red-200' : 'bg-[#AE6965]/5 text-[#AE6965]'}`}>
                          {isRecording ? <MicOff className="w-8 h-8 sm:w-12 sm:h-12" /> : <Mic className="w-8 h-8 sm:w-12 sm:h-12" />}
                        </div>
                        <h2 className="text-xl sm:text-3xl font-black text-slate-900 mb-2 sm:mb-4">
                          {isRecording ? 'Recording Case Details...' : 'Dictate Case Details'}
                        </h2>
                        <p className="text-xs sm:text-base text-slate-500 mb-8 sm:mb-10 leading-relaxed">
                          {isRecording ? 'Speak clearly. We are capturing your clinical dictation.' : 'Press the button below and start speaking your case presentation.'}
                        </p>
                        
                        <button 
                          onClick={startFullCaseAudioInput}
                          disabled={isProcessingFile}
                          className={`
                            w-full py-4 sm:py-6 rounded-xl sm:rounded-[2rem] font-black text-sm sm:text-lg transition-all flex items-center justify-center gap-3 sm:gap-4
                            ${isRecording 
                              ? 'bg-red-500 text-white shadow-xl shadow-red-200 hover:bg-red-600' 
                              : 'bg-[#AE6965] text-white shadow-xl shadow-[#AE6965]/20 hover:bg-[#8E5450]'}
                            ${isProcessingFile ? 'opacity-50 cursor-not-allowed' : ''}
                          `}
                        >
                          {isProcessingFile ? (
                            <>
                              <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
                              PROCESSING...
                            </>
                          ) : isRecording ? (
                            <>
                              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white animate-ping" />
                              STOP RECORDING
                            </>
                          ) : (
                            <>
                              <Mic className="w-5 h-5 sm:w-6 sm:h-6" />
                              START RECORDING
                            </>
                          )}
                        </button>
                        
                        {!isRecording && !isProcessingFile && (
                          <p className="text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-4 sm:mt-6">
                            MAX DURATION: 2 MINUTES
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key={currentStep.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col gap-6 md:gap-10"
                    >
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between px-2">
                          <div className="flex flex-col gap-1">
                            <h2 className="text-2xl sm:text-3xl md:text-5xl font-black tracking-widest uppercase text-slate-900 leading-tight">{currentStep.title}</h2>
                            <p className="text-xs sm:text-sm md:text-lg text-slate-400 font-medium">{currentStep.subtitle}</p>
                          </div>
                          <div className="hidden md:flex flex-col items-end gap-1">
                            <span className="text-[10px] font-bold text-[#AE6965] uppercase tracking-[0.2em]">Progress</span>
                            <div className="flex items-center gap-1.5">
                              {STEPS.map((s, i) => (
                                <div 
                                  key={s.id} 
                                  className={`w-2 h-2 rounded-full transition-all duration-500 ${i <= currentStepIndex ? 'bg-[#AE6965] scale-110' : 'bg-slate-100'}`} 
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden md:hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${((currentStepIndex + 1) / STEPS.length) * 100}%` }}
                            className="h-full bg-[#AE6965]"
                          />
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl sm:rounded-3xl md:rounded-[40px] p-6 sm:p-8 md:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/50 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#AE6965]/10 to-transparent" />
                        {renderStepContent(currentStep.id)}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Footer Navigation */}
            <footer className="h-20 sm:h-24 bg-white/90 backdrop-blur-xl border-t border-slate-100 px-4 sm:px-10 flex items-center justify-between sticky bottom-0 z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
              <button 
                onClick={() => {
                  if (generatorMode === 'selection') {
                    setView('dashboard');
                  } else {
                    handlePrev();
                  }
                }}
                disabled={currentStepIndex === 0 && generatorMode === 'form'}
                className={`
                  flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs md:text-sm font-black transition-all active:scale-95
                  ${currentStepIndex === 0 && generatorMode === 'form' ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:bg-slate-50'}
                `}
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="uppercase tracking-widest">{generatorMode === 'selection' ? 'Cancel' : 'Prev'}</span>
              </button>

              {generatorMode === 'form' && (
                <div className="flex items-center gap-2 sm:gap-4">
                  <button 
                    onClick={handleReset}
                    className="hidden sm:flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-red-50 text-red-600 text-xs font-black hover:bg-red-100 transition-all active:scale-95"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span className="uppercase tracking-widest">New Case</span>
                  </button>

                  {currentStepIndex === STEPS.length - 1 ? (
                    <button 
                      onClick={handleCompileReport}
                      disabled={isGenerating}
                      className="flex items-center gap-2 md:gap-3 px-6 sm:px-10 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-slate-900 text-white text-[11px] sm:text-xs md:text-sm font-black hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="uppercase tracking-widest">Generating...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span className="uppercase tracking-widest">Generate Story</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <button 
                      onClick={handleNext}
                      className="flex items-center gap-2 md:gap-3 px-6 sm:px-10 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-[#AE6965] text-white text-[11px] sm:text-xs md:text-sm font-black hover:bg-[#8E5450] transition-all shadow-lg shadow-[#AE6965]/20 group active:scale-95"
                    >
                      <span className="uppercase tracking-widest">Next</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )}
                </div>
              )}
            </footer>
          </>
        )}
      </main>

      {/* Loading Overlay */}
      <AnimatePresence>
        {isGenerating && !showReportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[100] flex flex-col items-center justify-center gap-4"
          >
            <div className="w-16 h-16 rounded-full bg-white shadow-xl flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-[#AE6965] animate-spin" />
            </div>
            <div className="text-center px-6">
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Generating Case Story</h3>
              <p className="text-xs text-[#AE6965] font-bold uppercase tracking-[0.2em] mt-2">{generationStatus || "Synthesizing clinical data..."}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report Selection Modal */}
      <AnimatePresence>
        {showConfirmModal.show && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirmModal(prev => ({ ...prev, show: false }))}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[2rem] p-8 shadow-2xl border border-slate-100"
            >
              <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-6 mx-auto">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900 text-center mb-2">{showConfirmModal.title}</h3>
              <p className="text-slate-500 text-center text-sm mb-8">{showConfirmModal.message}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(prev => ({ ...prev, show: false }))}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-all"
                >
                  CANCEL
                </button>
                <button
                  onClick={() => {
                    showConfirmModal.onConfirm();
                  }}
                  className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-xs hover:bg-red-600 transition-all shadow-lg shadow-red-200"
                >
                  CONFIRM
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showReportModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReportModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 flex flex-col gap-6">
                <div className="flex flex-col gap-2 text-center">
                  <h3 className="text-2xl font-bold text-slate-800">Choose Report Type</h3>
                  <p className="text-sm text-slate-400">Select how you would like your clinical data compiled.</p>
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={downloadOriginalReport}
                    disabled={originalReportStatus !== 'idle'}
                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-all group text-left ${
                      originalReportStatus === 'error' ? 'border-red-200 bg-red-50' : 
                      originalReportStatus === 'completed' ? 'border-emerald-200 bg-emerald-50' :
                      'border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                      originalReportStatus === 'error' ? 'bg-red-500 text-white' :
                      originalReportStatus === 'completed' ? 'bg-emerald-500 text-white' :
                      'bg-slate-100 text-slate-400 group-hover:bg-[#AE6965] group-hover:text-white'
                    }`}>
                      {originalReportStatus === 'generating' ? <Loader2 className="w-6 h-6 animate-spin" /> :
                       originalReportStatus === 'completed' ? <Check className="w-6 h-6" /> :
                       originalReportStatus === 'error' ? <AlertCircle className="w-6 h-6" /> :
                       <FileText className="w-6 h-6" />}
                    </div>
                    <div className="flex-1">
                      <p className={`font-bold ${
                        originalReportStatus === 'error' ? 'text-red-700' :
                        originalReportStatus === 'completed' ? 'text-emerald-700' :
                        'text-slate-700'
                      }`}>
                        {originalReportStatus === 'generating' ? 'Generating...' : 
                         originalReportStatus === 'completed' ? 'Download Complete' :
                         originalReportStatus === 'error' ? 'Generation Failed' :
                         'Original Report'}
                      </p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-tight">
                        {originalReportStatus === 'error' ? 'Please try again' : 'Structured clinical data capture'}
                      </p>
                    </div>
                    {originalReportStatus === 'idle' && <Download className="w-4 h-4 text-slate-300" />}
                  </button>

                  <button 
                    onClick={downloadStoryReport}
                    disabled={storyReportStatus !== 'idle'}
                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-all group text-left ${
                      storyReportStatus === 'error' ? 'border-red-200 bg-red-50' : 
                      storyReportStatus === 'completed' ? 'border-emerald-200 bg-emerald-50' :
                      'border-[#AE6965]/20 bg-[#AE6965]/5 hover:bg-[#AE6965]/10'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                      storyReportStatus === 'error' ? 'bg-red-500 text-white' :
                      storyReportStatus === 'completed' ? 'bg-emerald-500 text-white' :
                      'bg-[#AE6965] text-white'
                    }`}>
                      {storyReportStatus === 'generating' ? <Loader size="sm" /> :
                       storyReportStatus === 'completed' ? <Check className="w-6 h-6" /> :
                       storyReportStatus === 'error' ? <AlertCircle className="w-6 h-6" /> :
                       <BookOpen className="w-6 h-6" />}
                    </div>
                    <div className="flex-1">
                      <p className={`font-bold ${
                        storyReportStatus === 'error' ? 'text-red-700' :
                        storyReportStatus === 'completed' ? 'text-emerald-700' :
                        'text-[#AE6965]'
                      }`}>
                        {storyReportStatus === 'generating' ? 'Writing...' : 
                         storyReportStatus === 'completed' ? 'Story Complete' :
                         storyReportStatus === 'error' ? 'Writing Failed' :
                         'Generate Case Story'}
                      </p>
                      <p className={`text-[10px] uppercase tracking-tight ${
                        storyReportStatus === 'error' ? 'text-red-400' :
                        storyReportStatus === 'completed' ? 'text-emerald-400' :
                        'text-[#AE6965]/60'
                      }`}>
                        {storyReportStatus === 'error' ? 'Service unavailable' : 'A professional summary of the case.'}
                      </p>
                    </div>
                    {storyReportStatus === 'idle' && <Zap className="w-4 h-4 text-[#AE6965]" />}
                  </button>
                </div>

                <button 
                  onClick={() => setShowReportModal(false)}
                  className="w-full py-3 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
                >
                  CANCEL
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
