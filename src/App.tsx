/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
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
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, doc, getDocFromServer } from 'firebase/firestore';

// Component imports
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { Profile } from './components/Profile';
import { Loader } from './components/Loader';

// --- Types ---

type StepId = 
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

const STEPS: Step[] = [
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

const InputField = ({ label, placeholder, type = "text", value, onChange, required, onVoiceInput, isRecording }: any) => (
  <div className="flex flex-col gap-1.5 w-full">
    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div className="relative">
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50/50 text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#AE6965]/20 focus:border-[#AE6965] transition-all"
      />
      {onVoiceInput && (
        <button 
          type="button"
          onClick={onVoiceInput}
          className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 transition-colors ${isRecording ? 'text-red-500 animate-pulse' : 'text-slate-400 hover:text-[#AE6965]'}`}
        >
          {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>
      )}
    </div>
  </div>
);

const TextAreaField = ({ label, placeholder, value, onChange, required, onVoiceInput, isRecording }: any) => (
  <div className="flex flex-col gap-1.5 w-full">
    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div className="relative">
      <textarea
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50/50 text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#AE6965]/20 focus:border-[#AE6965] transition-all resize-none"
      />
      {onVoiceInput && (
        <button 
          type="button"
          onClick={onVoiceInput}
          className={`absolute right-3 bottom-3 p-1.5 transition-colors ${isRecording ? 'text-red-500 animate-pulse' : 'text-slate-400 hover:text-[#AE6965]'}`}
        >
          {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>
      )}
    </div>
  </div>
);

const SelectField = ({ label, options, value, onChange, required }: any) => (
  <div className="flex flex-col gap-1.5 w-full">
    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50/50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#AE6965]/20 focus:border-[#AE6965] transition-all"
    >
      <option value="">Select an option</option>
      {options.map((opt: string) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  </div>
);

const FileUpload = ({ label, subtitle, onFileSelect, isProcessing }: any) => (
  <div className="flex flex-col gap-1.5 w-full">
    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
      {label}
    </label>
    <label className={`w-full border-2 border-dashed border-slate-100 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 bg-slate-50/30 hover:bg-slate-50/50 transition-colors cursor-pointer group ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <input 
        type="file" 
        className="hidden" 
        accept="image/*,.pdf" 
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelect(file);
        }}
        disabled={isProcessing}
      />
      <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400 group-hover:text-[#AE6965] transition-colors">
        {isProcessing ? <Loader size="sm" /> : <Upload className="w-6 h-6" />}
      </div>
      <div className="text-center">
        <p className="text-sm font-bold text-slate-700">{isProcessing ? 'Processing...' : label}</p>
        <p className="text-[10px] text-slate-400 uppercase tracking-tight">{subtitle}</p>
      </div>
    </label>
  </div>
);

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

const SurgicalCaseWriteUpPDF = ({ formData, storyData, title }: { formData: any, storyData: any, title?: string }) => (
  <Document>
    {/* Page 1: Cover Page */}
    <Page size="A4" style={pdfStyles.page}>
      <View style={pdfStyles.coverPage}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 60 }}>{getInitials(formData.fullName)}</Text>
        <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 60 }}>CASE STORY</Text>
        <Text style={{ fontSize: 16, fontWeight: 'bold' }}>TOPIC: {title?.toUpperCase() || storyData.impression?.toUpperCase() || formData.chiefComplaint?.toUpperCase() || 'CLINICAL CASE'}</Text>
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
  const [formData, setFormData] = useState<any>({});
  const [completedSteps, setCompletedSteps] = useState<Set<StepId>>(new Set());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingField, setRecordingField] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. The client is offline.");
        }
      }
    }
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setAuthLoading(false);
    });

    // Load autosave data
    const savedData = localStorage.getItem('malae_autosave_form');
    if (savedData) {
      try {
        setFormData(JSON.parse(savedData));
      } catch (e) {
        console.error("Error loading autosave data:", e);
      }
    }

    return () => unsubscribe();
  }, []);

  // Autosave effect
  useEffect(() => {
    if (Object.keys(formData).length > 0) {
      localStorage.setItem('malae_autosave_form', JSON.stringify(formData));
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
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingField(field);
      
      // Stop after 10 seconds automatically or on user click
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          stopVoiceInput();
        }
      }, 10000);

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
    }
  };

  const transcribeAudio = async (blob: Blob, field: string) => {
    setGenerationStatus("Transcribing audio...");
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const model = "gemini-3-flash-preview";
        
        const response = await ai.models.generateContent({
          model,
          contents: [
            { text: "Transcribe this clinical audio accurately. Return only the transcription text." },
            { inlineData: { data: base64Audio, mimeType: 'audio/webm' } }
          ]
        });

        const transcription = response.text;
        if (transcription) {
          updateField(field, (formData[field] || '') + ' ' + transcription.trim());
        }
      };
    } catch (err) {
      console.error("Transcription error:", err);
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
          Extract all clinical data from this ${file.type.includes('pdf') ? 'PDF' : 'image'} and map it to the following JSON structure. 
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

  const handleLogout = async () => {
    setShowConfirmModal({
      show: true,
      title: 'Sign Out',
      message: 'Are you sure you want to sign out of your clinical session?',
      onConfirm: async () => {
        try {
          await signOut(auth);
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

      await addDoc(collection(db, 'reports'), reportPayload);
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
        You are a senior surgical consultant. Based on the following patient data, write a high-level, cohesive academic surgical case write-up.
        Strictly adhere to professional medical writing style, clinical nomenclature, and a formal academic tone.
        
        Patient Data:
        ${JSON.stringify(formData, null, 2)}
        
        Instructions:
        1. HPC Narrative: Write a detailed chronological story of the presenting complaint. Use phrases like "presented with history of...", "gradually progressive", "associated with...", "however no history of...".
        2. ROS Narrative: Provide a cohesive summary of the review of systems, mentioning both positive and negative findings in a professional manner.
        3. PMH Narrative: Summarize medical history, chronic conditions (e.g., "known ISS on HAART"), and medications.
        4. PSH Narrative: Summarize surgical history and trauma.
        5. FSH Narrative: Summarize family and social history, including lifestyle factors.
        6. Examination Narrative: Provide a professional write-up of physical examination findings, including General Examination, Vitals, Local Examination (e.g., "Anterior neck swelling, asymmetrical..."), and Systemic Examination (Cardiovascular, Respiratory, CNS, Abdominal).
        7. Differentials: Provide a list of 5-10 differential diagnoses. For each, include the diagnosis name and a detailed medical reasoning "in view of..." and "unlikely because...".
        8. Case Discussion: Provide a deep academic discussion with sections: "Definition and Pathophysiology", "Pathophysiological Mechanisms", "Clinical Features and Presentation", "Investigations and Diagnostic Workup", "Management and Treatment Approach".
        9. Impression: Provide a concise clinical impression (e.g., "46/F known ISS on HAART with non-toxic nodular goitre").
        10. Plan: Provide a 5-10 point clinical management plan.
        11. References: Provide 4-5 academic references in standard medical format.
        
        Handling Missing Data & Edge Cases:
        - If specific clinical details (e.g., vitals, specific system reviews, or surgical history) are missing from the input, DO NOT hallucinate or invent data.
        - Instead, use professional clinical language to indicate the absence of data, such as "Not documented at the time of presentation," "Further history required to clarify...", or "Clinical records regarding [specific area] were unavailable."
        - If examination findings are missing, the "Examination Narrative" should state that a formal examination was not recorded, and the "Plan" MUST prioritize "Complete physical and systemic examination" as a primary step.
        - If diagnostic data is sparse, the "Case Discussion" should focus on the typical diagnostic workup for the suspected condition, and the "Plan" should include the necessary investigations.
        
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
        setCurrentStepIndex(0);
        setCompletedSteps(new Set());
        setGeneratorMode('selection');
        setShowConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  };

  const updateField = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const renderStepContent = (stepId: StepId) => {
    switch (stepId) {
      case 'demographics':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField label="Date of Admission" type="date" value={formData.admissionDate} onChange={(v: any) => updateField('admissionDate', v)} required />
            <InputField label="Patient Initials" placeholder="J.D" value={formData.fullName} onChange={(v: any) => updateField('fullName', v)} required onVoiceInput={() => startVoiceInput('fullName')} isRecording={recordingField === 'fullName'} />
            <InputField label="Age (years)" placeholder="45" value={formData.age} onChange={(v: any) => updateField('age', v)} required onVoiceInput={() => startVoiceInput('age')} isRecording={recordingField === 'age'} />
            <InputField label="Sex" placeholder="Male/Female" value={formData.sex} onChange={(v: any) => updateField('sex', v)} required onVoiceInput={() => startVoiceInput('sex')} isRecording={recordingField === 'sex'} />
            <InputField label="Tribe/Ethnicity" placeholder="Kikuyu" value={formData.ethnicity} onChange={(v: any) => updateField('ethnicity', v)} onVoiceInput={() => startVoiceInput('ethnicity')} isRecording={recordingField === 'ethnicity'} />
            <InputField label="Address/Location" placeholder="Nairobi" value={formData.address} onChange={(v: any) => updateField('address', v)} onVoiceInput={() => startVoiceInput('address')} isRecording={recordingField === 'address'} />
            <InputField label="Religion" placeholder="Christian" value={formData.religion} onChange={(v: any) => updateField('religion', v)} onVoiceInput={() => startVoiceInput('religion')} isRecording={recordingField === 'religion'} />
            <InputField label="Occupation" placeholder="Teacher" value={formData.occupation} onChange={(v: any) => updateField('occupation', v)} onVoiceInput={() => startVoiceInput('occupation')} isRecording={recordingField === 'occupation'} />
            <InputField label="Next of Kin (Initials)" placeholder="J.D" value={formData.nextOfKin} onChange={(v: any) => updateField('nextOfKin', v)} onVoiceInput={() => startVoiceInput('nextOfKin')} isRecording={recordingField === 'nextOfKin'} />
            <InputField label="Relationship" placeholder="Spouse" value={formData.relationship} onChange={(v: any) => updateField('relationship', v)} onVoiceInput={() => startVoiceInput('relationship')} isRecording={recordingField === 'relationship'} />
          </div>
        );
      case 'presenting_complaint':
        return (
          <div className="flex flex-col gap-8">
            <TextAreaField label="Chief Complaint" placeholder="e.g., Neck swelling, Epigastric pain" value={formData.chiefComplaint} onChange={(v: any) => updateField('chiefComplaint', v)} required onVoiceInput={() => startVoiceInput('chiefComplaint')} isRecording={recordingField === 'chiefComplaint'} />
            <InputField label="Duration" placeholder="e.g., 1 year, 2 months" value={formData.duration} onChange={(v: any) => updateField('duration', v)} required onVoiceInput={() => startVoiceInput('duration')} isRecording={recordingField === 'duration'} />
          </div>
        );
      case 'hpc_details':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField label="Onset" placeholder="sudden/gradual/insidious" value={formData.onset} onChange={(v: any) => updateField('onset', v)} onVoiceInput={() => startVoiceInput('onset')} isRecording={recordingField === 'onset'} />
            <InputField label="Progression" placeholder="progressive/static/improving" value={formData.progression} onChange={(v: any) => updateField('progression', v)} onVoiceInput={() => startVoiceInput('progression')} isRecording={recordingField === 'progression'} />
            <InputField label="Character" placeholder="sharp, dull, burning, aching" value={formData.character} onChange={(v: any) => updateField('character', v)} onVoiceInput={() => startVoiceInput('character')} isRecording={recordingField === 'character'} />
            <InputField label="Severity" placeholder="mild/moderate/severe or 1-10" value={formData.severity} onChange={(v: any) => updateField('severity', v)} onVoiceInput={() => startVoiceInput('severity')} isRecording={recordingField === 'severity'} />
            <InputField label="Location" placeholder="exact anatomical location" value={formData.location} onChange={(v: any) => updateField('location', v)} onVoiceInput={() => startVoiceInput('location')} isRecording={recordingField === 'location'} />
            <InputField label="Radiation" placeholder="where symptoms radiate" value={formData.radiation} onChange={(v: any) => updateField('radiation', v)} onVoiceInput={() => startVoiceInput('radiation')} isRecording={recordingField === 'radiation'} />
            <div className="md:col-span-2">
              <TextAreaField label="Associated Symptoms (Present)" placeholder="fever, weight loss, night sweats, cough, etc." value={formData.associatedSymptoms} onChange={(v: any) => updateField('associatedSymptoms', v)} onVoiceInput={() => startVoiceInput('associatedSymptoms')} isRecording={recordingField === 'associatedSymptoms'} />
            </div>
            <div className="md:col-span-2">
              <TextAreaField label="Important Negative Findings" placeholder="symptoms NOT present that help rule out differentials" value={formData.negativeFindings} onChange={(v: any) => updateField('negativeFindings', v)} onVoiceInput={() => startVoiceInput('negativeFindings')} isRecording={recordingField === 'negativeFindings'} />
            </div>
            <InputField label="Aggravating Factors" placeholder="lying flat, spicy foods, movement" value={formData.aggravating} onChange={(v: any) => updateField('aggravating', v)} onVoiceInput={() => startVoiceInput('aggravating')} isRecording={recordingField === 'aggravating'} />
            <InputField label="Relieving Factors" placeholder="rest, medication, position" value={formData.relieving} onChange={(v: any) => updateField('relieving', v)} onVoiceInput={() => startVoiceInput('relieving')} isRecording={recordingField === 'relieving'} />
            <InputField label="Previous Treatment" placeholder="medications tried" value={formData.prevTreatment} onChange={(v: any) => updateField('prevTreatment', v)} onVoiceInput={() => startVoiceInput('prevTreatment')} isRecording={recordingField === 'prevTreatment'} />
            <InputField label="Response to Treatment" placeholder="improvement/no change/worsening" value={formData.respTreatment} onChange={(v: any) => updateField('respTreatment', v)} onVoiceInput={() => startVoiceInput('respTreatment')} isRecording={recordingField === 'respTreatment'} />
            <div className="md:col-span-2">
              <TextAreaField label="Impact on Daily Activities" placeholder="how symptoms affect daily life" value={formData.impact} onChange={(v: any) => updateField('impact', v)} onVoiceInput={() => startVoiceInput('impact')} isRecording={recordingField === 'impact'} />
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
                  <InputField label="Symptoms Present" value={formData[`${system}_present`]} onChange={(v: any) => updateField(`${system}_present`, v)} onVoiceInput={() => startVoiceInput(`${system}_present`)} isRecording={recordingField === `${system}_present`} />
                  <InputField label="Symptoms Denied" value={formData[`${system}_denied`]} onChange={(v: any) => updateField(`${system}_denied`, v)} onVoiceInput={() => startVoiceInput(`${system}_denied`)} isRecording={recordingField === `${system}_denied`} />
                </div>
              </div>
            ))}
          </div>
        );
      case 'past_medical_hx':
        return (
          <div className="flex flex-col gap-8">
            <TextAreaField label="Chronic Medical Conditions" value={formData.chronicConditions} onChange={(v: any) => updateField('chronicConditions', v)} onVoiceInput={() => startVoiceInput('chronicConditions')} isRecording={recordingField === 'chronicConditions'} />
            <TextAreaField label="Current Pharmacotherapy" value={formData.medications} onChange={(v: any) => updateField('medications', v)} onVoiceInput={() => startVoiceInput('medications')} isRecording={recordingField === 'medications'} />
            <TextAreaField label="Allergies & Hypersensitivities" value={formData.allergies} onChange={(v: any) => updateField('allergies', v)} onVoiceInput={() => startVoiceInput('allergies')} isRecording={recordingField === 'allergies'} />
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
            <TextAreaField label="Previous Surgeries" placeholder="Appendectomy 2015, etc." value={formData.surgeries} onChange={(v: any) => updateField('surgeries', v)} onVoiceInput={() => startVoiceInput('surgeries')} isRecording={recordingField === 'surgeries'} />
            <InputField label="Major Trauma/Fractures" placeholder="Describe any major injuries" value={formData.trauma} onChange={(v: any) => updateField('trauma', v)} onVoiceInput={() => startVoiceInput('trauma')} isRecording={recordingField === 'trauma'} />
            <InputField label="Blood Transfusion History" placeholder="Yes/No, if yes when and why" value={formData.transfusions} onChange={(v: any) => updateField('transfusions', v)} onVoiceInput={() => startVoiceInput('transfusions')} isRecording={recordingField === 'transfusions'} />
          </div>
        );
      case 'family_social_hx':
        return (
          <div className="flex flex-col gap-8">
            <TextAreaField label="Familial Health Patterns" value={formData.familyHistory} onChange={(v: any) => updateField('familyHistory', v)} onVoiceInput={() => startVoiceInput('familyHistory')} isRecording={recordingField === 'familyHistory'} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SelectField label="Alcohol Consumption" options={['None', 'Social', 'Heavy']} value={formData.alcohol} onChange={(v: any) => updateField('alcohol', v)} />
              <SelectField label="Tobacco Consumption" options={['None', 'Occasional', 'Regular']} value={formData.tobacco} onChange={(v: any) => updateField('tobacco', v)} />
              <InputField label="Current Marital Status" value={formData.maritalStatus} onChange={(v: any) => updateField('maritalStatus', v)} onVoiceInput={() => startVoiceInput('maritalStatus')} isRecording={recordingField === 'maritalStatus'} />
              <InputField label="Household Dependents" value={formData.dependents} onChange={(v: any) => updateField('dependents', v)} onVoiceInput={() => startVoiceInput('dependents')} isRecording={recordingField === 'dependents'} />
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
      <aside className="hidden md:flex w-80 bg-white border-r border-slate-100 flex-col shrink-0 sticky top-0 h-screen shadow-[1px_0_10px_rgba(0,0,0,0.02)]">
        <div className="p-10 flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-[1.25rem] bg-slate-50 flex items-center justify-center border border-slate-100 mb-4 group hover:border-[#AE6965] transition-all duration-500">
            <div className="w-2.5 h-2.5 rounded-full bg-[#AE6965] animate-pulse group-hover:scale-125 transition-transform" />
          </div>
          <h1 className="text-2xl font-black tracking-tighter text-slate-900">Malae</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] text-center">
            Medical Workspace
          </p>
        </div>

        <nav className="flex-1 px-6 py-4 flex flex-col gap-1 overflow-y-auto">
          <button
            onClick={() => setView('dashboard')}
            className={`
              flex items-center gap-4 px-5 py-4 rounded-2xl transition-all group relative mb-2
              ${view === 'dashboard' ? 'bg-[#AE6965] text-white shadow-xl shadow-[#AE6965]/20' : 'text-slate-500 hover:bg-slate-50'}
            `}
          >
            <div className={`
              w-9 h-9 rounded-xl flex items-center justify-center transition-colors
              ${view === 'dashboard' ? 'bg-white/20' : 'bg-slate-100 text-slate-400 group-hover:bg-white group-hover:text-[#AE6965]'}
            `}>
              <LayoutDashboard className="w-4.5 h-4.5" />
            </div>
            <span className="text-sm font-bold tracking-tight">My Cases</span>
          </button>

          <button
            onClick={() => setView('profile')}
            className={`
              flex items-center gap-4 px-5 py-4 rounded-2xl transition-all group relative mb-6
              ${view === 'profile' ? 'bg-[#AE6965] text-white shadow-xl shadow-[#AE6965]/20' : 'text-slate-500 hover:bg-slate-50'}
            `}
          >
            <div className={`
              w-9 h-9 rounded-xl flex items-center justify-center transition-colors
              ${view === 'profile' ? 'bg-white/20' : 'bg-slate-100 text-slate-400 group-hover:bg-white group-hover:text-[#AE6965]'}
            `}>
              <UserIcon className="w-4.5 h-4.5" />
            </div>
            <span className="text-sm font-bold tracking-tight">My Profile</span>
          </button>

          {view === 'generator' && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-1"
            >
              <div className="px-5 py-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Case Details</span>
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
                      w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all group relative
                      ${isActive ? 'bg-[#AE6965]/10 text-[#AE6965]' : 'text-slate-500 hover:bg-slate-50'}
                    `}
                  >
                    <div className={`
                      w-8 h-8 rounded-xl flex items-center justify-center transition-all
                      ${isActive ? 'bg-[#AE6965] text-white shadow-lg shadow-[#AE6965]/20' : isCompleted ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-100 text-slate-400'}
                    `}>
                      {isCompleted && !isActive ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                    </div>
                    <span className={`text-xs font-bold tracking-tight transition-colors ${isActive ? 'text-[#AE6965]' : 'text-slate-500'}`}>
                      {step.label}
                    </span>
                    {isActive && (
                      <motion.div 
                        layoutId="activeStep"
                        className="absolute left-0 w-1 h-6 bg-[#AE6965] rounded-r-full"
                      />
                    )}
                  </button>
                );
              })}
            </motion.div>
          )}
        </nav>

        <div className="p-6 border-t border-slate-50 space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50">
            <div className="w-10 h-10 rounded-full bg-[#AE6965] flex items-center justify-center text-white font-bold">
              {user.displayName?.[0] || user.email?.[0].toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-800 truncate">{user.displayName || 'Physician'}</span>
              <span className="text-[10px] text-slate-400 truncate">{user.email}</span>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:text-red-500 hover:bg-red-50 transition-all font-bold text-xs"
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
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.aside 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-[#AE6965] z-50 flex flex-col shadow-2xl md:hidden"
            >
              <div className="p-6 flex items-center justify-between border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#AE6965]">
                    <Stethoscope className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-white">Malae</span>
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-white/60 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex-1 px-4 py-6 flex flex-col gap-1 overflow-y-auto">
                <button
                  onClick={() => { setView('dashboard'); setIsSidebarOpen(false); }}
                  className={`
                    flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all mb-2
                    ${view === 'dashboard' ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10'}
                  `}
                >
                  <LayoutDashboard className="w-5 h-5" />
                  <span className="text-sm font-semibold tracking-tight">My Cases</span>
                </button>

                <button
                  onClick={() => { setView('profile'); setIsSidebarOpen(false); }}
                  className={`
                    flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all mb-4
                    ${view === 'profile' ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10'}
                  `}
                >
                  <UserIcon className="w-5 h-5" />
                  <span className="text-sm font-semibold tracking-tight">My Profile</span>
                </button>

                {view === 'generator' && STEPS.map((step, index) => {
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
                        flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all
                        ${isActive ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10'}
                      `}
                    >
                      <div className={`
                        w-8 h-8 rounded-xl flex items-center justify-center
                        ${isActive ? 'bg-white text-[#AE6965]' : isCompleted ? 'bg-white/20 text-white' : 'bg-white/10 text-white/40'}
                      `}>
                        {isCompleted && !isActive ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                      </div>
                      <span className="text-sm font-semibold tracking-tight">{step.label}</span>
                    </button>
                  );
                })}
              </nav>
              <div className="p-6 border-t border-white/10 bg-black/10">
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-white bg-white/10 hover:bg-white/20 transition-all font-bold text-xs"
                >
                  <LogOut className="w-4 h-4" />
                  SIGN OUT
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
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
                className="flex items-center gap-2 text-slate-500 hover:text-[#AE6965] font-bold text-[10px] sm:text-xs md:text-sm mb-4 sm:mb-6 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                BACK TO MY CASES
              </button>
              
              <div className="bg-white rounded-2xl sm:rounded-[32px] p-6 sm:p-8 md:p-12 shadow-sm border border-slate-100">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 sm:mb-12 pb-8 sm:pb-12 border-b border-slate-50">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2 leading-tight">{selectedReport.title}</h1>
                    <div className="flex items-center gap-3">
                      <p className="text-xs sm:text-sm text-slate-500 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {selectedReport.createdAt?.toDate ? selectedReport.createdAt.toDate().toLocaleDateString() : 'Recently'}
                      </p>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-[0.15em] border ${
                        selectedReport.type === 'story' 
                          ? 'bg-[#AE6965]/5 text-[#AE6965] border-[#AE6965]/20' 
                          : 'bg-slate-50 text-slate-500 border-slate-200'
                      }`}>
                        {selectedReport.type === 'story' ? 'Case Story' : 'Case Details'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={async () => {
                        if (selectedReport.type === 'story') {
                          const blob = await pdf(<SurgicalCaseWriteUpPDF formData={selectedReport.patientData} storyData={selectedReport.reportData} />).toBlob();
                          triggerDownload(blob, `Surgical_Case_WriteUp_${selectedReport.patientData.fullName || 'Patient'}`);
                        } else {
                          const blob = await pdf(<MedicalReportPDF formData={selectedReport.patientData} />).toBlob();
                          triggerDownload(blob, `Clinical_Report_${selectedReport.patientData.fullName || 'Patient'}`);
                        }
                      }}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white font-bold text-xs sm:text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                    >
                      <Download className="w-4 h-4" />
                      DOWNLOAD PDF
                    </button>
                  </div>
                </div>

                <div className="space-y-8 sm:space-y-12">
                  {selectedReport.type === 'story' ? (
                    <>
                      <section>
                        <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                          <div className="w-1.5 sm:w-2 h-6 sm:h-8 bg-[#AE6965] rounded-full" />
                          Case Summary
                        </h2>
                        <p className="text-slate-600 leading-relaxed text-base sm:text-lg">{selectedReport.reportData.hpcNarrative}</p>
                      </section>

                      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                        <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-50 border border-slate-100">
                          <h3 className="font-bold text-slate-900 mb-3 uppercase text-[10px] tracking-widest">Clinical Impression</h3>
                          <p className="text-sm sm:text-base text-slate-700 font-medium">{selectedReport.reportData.impression}</p>
                        </div>
                        <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-50 border border-slate-100">
                          <h3 className="font-bold text-slate-900 mb-3 uppercase text-[10px] tracking-widest">Management Plan</h3>
                          <ul className="space-y-2">
                            {selectedReport.reportData.plan?.map((item: string, i: number) => (
                              <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-slate-600">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </section>

                      <section>
                        <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-6">Possible Diagnoses</h2>
                        <div className="space-y-4">
                          {selectedReport.reportData.differentials?.map((diff: any, i: number) => (
                            <div key={i} className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 hover:border-[#AE6965]/30 transition-colors">
                              <h4 className="font-bold text-sm sm:text-base text-slate-900 mb-2">{i + 1}. {diff.diagnosis}</h4>
                              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">{diff.reasoning}</p>
                            </div>
                          ))}
                        </div>
                      </section>
                    </>
                  ) : (
                    <div className="space-y-8">
                      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Patient Name</p>
                          <p className="text-sm font-bold text-slate-900">{selectedReport.patientData.fullName || 'Not recorded'}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Chief Complaint</p>
                          <p className="text-sm font-bold text-slate-900">{selectedReport.patientData.chiefComplaint || 'Not recorded'}</p>
                        </div>
                      </section>
                      
                      <section>
                        <h2 className="text-lg font-bold text-slate-900 mb-4">Clinical History</h2>
                        <div className="space-y-4">
                          <div className="p-4 rounded-xl border border-slate-100">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">History of Presenting Illness</h4>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedReport.patientData.hpi || 'No data recorded'}</p>
                          </div>
                          <div className="p-4 rounded-xl border border-slate-100">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Past Medical History</h4>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedReport.patientData.pmh || 'No data recorded'}</p>
                          </div>
                        </div>
                      </section>

                      <div className="p-6 rounded-2xl bg-[#AE6965]/5 border border-[#AE6965]/10 text-center">
                        <Sparkles className="w-8 h-8 text-[#AE6965] mx-auto mb-3" />
                        <h4 className="font-bold text-slate-900 mb-2">Write a case story?</h4>
                        <p className="text-xs text-slate-500 mb-4">Create a professional narrative summary from these details.</p>
                          <button 
                            onClick={() => {
                              setFormData(selectedReport.patientData);
                              setCurrentStepIndex(0);
                              setCompletedSteps(new Set([0, 1, 2, 3, 4, 5, 6])); // Mark all as done
                              setView('generator');
                            }}
                            className="px-6 py-2 rounded-lg bg-[#AE6965] text-white text-xs font-bold hover:bg-[#8E5450] transition-all"
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
            <header className="h-16 md:h-20 bg-white border-b border-slate-100 px-4 md:px-10 flex items-center justify-between sticky top-0 z-30">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-2 -ml-2 text-slate-500 hover:bg-slate-50 rounded-xl md:hidden"
                >
                  <Menu className="w-6 h-6" />
                </button>
                <div className="flex flex-col">
                  <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Module {currentStepIndex + 1}/{STEPS.length}</span>
                  <span className="text-xs md:text-sm font-bold text-slate-800 truncate max-w-[150px] md:max-w-none">{currentStep.label}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setView('dashboard')}
                  className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl text-slate-500 text-[10px] md:text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">DASHBOARD</span>
                </button>
                <button 
                  onClick={handleReset}
                  className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl bg-[#AE6965] text-white text-[10px] md:text-xs font-bold hover:bg-[#8E5450] transition-colors shadow-sm"
                >
                  <RotateCcw className="w-3 md:w-3.5 h-3 md:h-3.5" />
                  <span className="hidden sm:inline">RESET SESSION</span>
                  <span className="sm:hidden">RESET</span>
                </button>
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
                      className="flex flex-col gap-10"
                    >
                      <div className="flex flex-col gap-2 text-center md:text-left">
                        <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 leading-tight">Start New Case</h2>
                        <p className="text-lg text-slate-400 font-medium">Choose your preferred method of clinical data entry.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <button 
                          onClick={() => setGeneratorMode('form')}
                          className="group p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-[#AE6965]/20 hover:border-[#AE6965] hover:bg-[#AE6965]/[0.02] transition-all flex flex-col items-center text-center gap-6 relative overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 w-32 h-32 bg-[#AE6965]/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                          <div className="w-20 h-20 rounded-3xl bg-[#AE6965]/10 text-[#AE6965] flex items-center justify-center group-hover:bg-[#AE6965] group-hover:text-white transition-all duration-500 relative z-10">
                            <ClipboardList className="w-10 h-10" />
                          </div>
                          <div className="relative z-10">
                            <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-[#AE6965] transition-colors">Direct Form</h3>
                            <p className="text-sm text-slate-400 leading-relaxed group-hover:text-slate-500 transition-colors">Enter case details manually using our structured clinical form.</p>
                          </div>
                          <div className="mt-auto flex items-center gap-2 text-[#AE6965] font-bold text-xs opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 relative z-10">
                            PROCEED <ChevronRight className="w-4 h-4" />
                          </div>
                        </button>

                        <button 
                          onClick={() => setGeneratorMode('upload')}
                          className="group p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-[#AE6965]/20 hover:border-[#AE6965] hover:bg-[#AE6965]/[0.02] transition-all flex flex-col items-center text-center gap-6 relative overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 w-32 h-32 bg-[#AE6965]/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                          <div className="w-20 h-20 rounded-3xl bg-[#AE6965]/10 text-[#AE6965] flex items-center justify-center group-hover:bg-[#AE6965] group-hover:text-white transition-all duration-500 relative z-10">
                            <FileUp className="w-10 h-10" />
                          </div>
                          <div className="relative z-10">
                            <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-[#AE6965] transition-colors">Document Upload</h3>
                            <p className="text-sm text-slate-400 leading-relaxed group-hover:text-slate-500 transition-colors">Upload a PDF or image of clinical notes to extract data automatically.</p>
                          </div>
                          <div className="mt-auto flex items-center gap-2 text-[#AE6965] font-bold text-xs opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 relative z-10">
                            UPLOAD FILE <ChevronRight className="w-4 h-4" />
                          </div>
                        </button>

                        <button 
                          onClick={() => setGeneratorMode('audio')}
                          className="group p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-[#AE6965]/20 hover:border-[#AE6965] hover:bg-[#AE6965]/[0.02] transition-all flex flex-col items-center text-center gap-6 relative overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 w-32 h-32 bg-[#AE6965]/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                          <div className="w-20 h-20 rounded-3xl bg-[#AE6965]/10 text-[#AE6965] flex items-center justify-center group-hover:bg-[#AE6965] group-hover:text-white transition-all duration-500 relative z-10">
                            <Mic className="w-10 h-10" />
                          </div>
                          <div className="relative z-10">
                            <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-[#AE6965] transition-colors">Audio Input</h3>
                            <p className="text-sm text-slate-400 leading-relaxed group-hover:text-slate-500 transition-colors">Dictate the case details and let AI transcribe and organize the data.</p>
                          </div>
                          <div className="mt-auto flex items-center gap-2 text-[#AE6965] font-bold text-xs opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 relative z-10">
                            START RECORDING <ChevronRight className="w-4 h-4" />
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
                      className="flex flex-col gap-8 max-w-2xl mx-auto"
                    >
                      <button 
                        onClick={() => setGeneratorMode('selection')}
                        className="flex items-center gap-2 text-slate-400 hover:text-[#AE6965] font-bold text-xs transition-colors self-start"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        BACK TO OPTIONS
                      </button>
                      
                      <div className="bg-white rounded-[2.5rem] p-12 shadow-sm border border-slate-100 text-center">
                        <div className="w-24 h-24 rounded-3xl bg-[#AE6965]/5 text-[#AE6965] flex items-center justify-center mx-auto mb-8">
                          <FileUp className="w-12 h-12" />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 mb-4">Upload Clinical Document</h2>
                        <p className="text-slate-500 mb-10">Select a PDF or image file (clinical notes, lab results, etc.) to extract patient data.</p>
                        
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
                      className="flex flex-col gap-8 max-w-2xl mx-auto"
                    >
                      <button 
                        onClick={() => setGeneratorMode('selection')}
                        className="flex items-center gap-2 text-slate-400 hover:text-[#AE6965] font-bold text-xs transition-colors self-start"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        BACK TO OPTIONS
                      </button>
                      
                      <div className="bg-white rounded-[2.5rem] p-12 shadow-sm border border-slate-100 text-center">
                        <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 transition-all duration-500 ${isRecording ? 'bg-red-500 text-white animate-pulse shadow-2xl shadow-red-200' : 'bg-[#AE6965]/5 text-[#AE6965]'}`}>
                          {isRecording ? <MicOff className="w-12 h-12" /> : <Mic className="w-12 h-12" />}
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 mb-4">
                          {isRecording ? 'Recording Case Details...' : 'Dictate Case Details'}
                        </h2>
                        <p className="text-slate-500 mb-10">
                          {isRecording ? 'Speak clearly. We are capturing your clinical dictation.' : 'Press the button below and start speaking your case presentation.'}
                        </p>
                        
                        <button 
                          onClick={startFullCaseAudioInput}
                          disabled={isProcessingFile}
                          className={`
                            w-full py-6 rounded-[2rem] font-black text-lg transition-all flex items-center justify-center gap-4
                            ${isRecording 
                              ? 'bg-red-500 text-white shadow-xl shadow-red-200 hover:bg-red-600' 
                              : 'bg-[#AE6965] text-white shadow-xl shadow-[#AE6965]/20 hover:bg-[#8E5450]'}
                            ${isProcessingFile ? 'opacity-50 cursor-not-allowed' : ''}
                          `}
                        >
                          {isProcessingFile ? (
                            <>
                              <Loader2 className="w-6 h-6 animate-spin" />
                              PROCESSING...
                            </>
                          ) : isRecording ? (
                            <>
                              <div className="w-3 h-3 rounded-full bg-white animate-ping" />
                              STOP RECORDING
                            </>
                          ) : (
                            <>
                              <Mic className="w-6 h-6" />
                              START RECORDING
                            </>
                          )}
                        </button>
                        
                        {!isRecording && !isProcessingFile && (
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-6">
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
                      <div className="flex flex-col gap-1 md:gap-2 text-center md:text-left">
                        <h2 className="text-xl sm:text-2xl md:text-4xl font-bold tracking-tight text-slate-800 leading-tight">{currentStep.title}</h2>
                        <p className="text-xs sm:text-sm md:text-lg text-slate-400 font-medium">{currentStep.subtitle}</p>
                      </div>

                      <div className="bg-white rounded-2xl sm:rounded-3xl md:rounded-[32px] p-5 sm:p-8 md:p-10 shadow-sm border border-slate-100">
                        {renderStepContent(currentStep.id)}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Footer Navigation */}
            <footer className="h-20 md:h-24 bg-white border-t border-slate-100 px-4 md:px-10 flex items-center justify-between sticky bottom-0 z-30">
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
                  flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold transition-all
                  ${currentStepIndex === 0 && generatorMode === 'form' ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:bg-slate-50'}
                `}
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">{generatorMode === 'selection' ? 'CANCEL' : 'PREVIOUS'}</span>
              </button>

              {generatorMode === 'form' && (
                <button 
                  onClick={handleReset}
                  className="flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl md:rounded-2xl bg-red-50 text-red-600 text-xs md:text-sm font-bold hover:bg-red-100 transition-all sm:shadow-lg sm:shadow-red-100"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="hidden sm:inline">NEW CASE</span>
                </button>
              )}

              {generatorMode === 'form' && (
                currentStepIndex === STEPS.length - 1 ? (
                  <button 
                    onClick={handleCompileReport}
                    disabled={isGenerating}
                    className="flex items-center gap-2 md:gap-3 px-5 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl bg-slate-900 text-white text-xs md:text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="hidden sm:inline">GENERATING...</span>
                        <span className="sm:hidden">...</span>
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4" />
                        <span className="hidden sm:inline">COMPILE REPORT</span>
                        <span className="sm:hidden">COMPILE</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button 
                    onClick={handleNext}
                    className="flex items-center gap-2 md:gap-3 px-5 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl bg-[#AE6965] text-white text-xs md:text-sm font-bold hover:bg-[#8E5450] transition-all shadow-lg shadow-[#AE6965]/20 group"
                  >
                    <span className="hidden sm:inline">PROCEED</span>
                    <span className="sm:hidden">NEXT</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                )
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
              <h3 className="text-xl font-bold text-slate-800">Compiling Report</h3>
              <p className="text-sm text-slate-400 font-medium">{generationStatus || "Capturing clinical data and generating PDF..."}</p>
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
