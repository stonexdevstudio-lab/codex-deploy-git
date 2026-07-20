/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Lead } from '../types';
import { 
  Users, 
  Mail, 
  Phone, 
  Calendar, 
  MessageSquare, 
  Search, 
  Filter, 
  Loader2, 
  RefreshCw, 
  MailCheck, 
  Building2, 
  Briefcase, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Save 
} from 'lucide-react';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useConfirm } from './ConfirmDialog';

interface LeadsSectionProps {
  leads: Lead[];
  onUpdateLead?: () => void;
  isLoading?: boolean;
}

export default function LeadsSection({ leads, onUpdateLead, isLoading = false }: LeadsSectionProps) {
  const { confirm } = useConfirm();
  const [filterQuery, setFilterQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // all, new, status_new, status_progress, etc.
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null);
  
  // Dashboard Sub-Tabs
  const [leadTypeTab, setLeadTypeTab] = useState<'quote' | 'chatbot'>('quote');
  
  // Business Email Connection States
  const [businessEmail, setBusinessEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [initialEmailLoaded, setInitialEmailLoaded] = useState(false);

  // Message Expand States
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null);

  // Fetch Connected Business Email from Firestore
  useEffect(() => {
    const fetchLeadsConfig = async () => {
      try {
        const configSnap = await getDoc(doc(db, 'siteConfig', 'leadsConfig'));
        if (configSnap.exists()) {
          setBusinessEmail(configSnap.data().businessEmail || '');
        }
      } catch (err) {
        console.error("Error loading business email connection config:", err);
      } finally {
        setInitialEmailLoaded(true);
      }
    };
    fetchLeadsConfig();
  }, []);

  // Save Connected Business Email to Firestore
  const handleSaveBusinessEmail = async () => {
    if (!businessEmail || !businessEmail.includes('@')) {
      alert("Please enter a valid business email address.");
      return;
    }

    setSavingEmail(true);
    try {
      await setDoc(doc(db, 'siteConfig', 'leadsConfig'), {
        businessEmail: businessEmail.trim(),
        lastConnectedAt: new Date().toISOString()
      }, { merge: true });
      
      confirm({
        title: 'Email Connected Successfully',
        message: `Quote requests submitted by customers on the public site will now open prefilled templates addressed to: ${businessEmail}`,
        type: 'success',
        onConfirm: () => {}
      });
    } catch (err) {
      console.error("Failed to connect business email ID:", err);
      alert("Failed to save email connection. Check your database rules.");
    } finally {
      setSavingEmail(false);
    }
  };

  const getIsNew = (timestampStr: string) => {
    try {
      const ms = new Date(timestampStr).getTime();
      return (Date.now() - ms) < 86400000; // less than 24 hours
    } catch {
      return false;
    }
  };

  const handleUpdateStatus = (leadId: string, newStatus: 'New' | 'In Progress' | 'Contacted' | 'Closed') => {
    confirm({
      title: 'Update Lead Status',
      message: `Are you sure you want to change this customer lead status to "${newStatus}"? This updates the customer file in Firestore.`,
      type: 'update',
      onConfirm: async () => {
        setUpdatingLeadId(leadId);
        try {
          const leadRef = doc(db, 'chatbot_leads', leadId);
          await updateDoc(leadRef, { status: newStatus });
          if (onUpdateLead) {
            onUpdateLead();
          }
        } catch (err) {
          console.error("Error updating lead status:", err);
          alert("Failed to update status. Please try again.");
        } finally {
          setUpdatingLeadId(null);
        }
      }
    });
  };

  // 1. Separate Leads based on chosen sub-tab ('quote' or 'chatbot')
  const baseLeads = leads.filter(lead => {
    if (leadTypeTab === 'quote') {
      return lead.type === 'quote';
    } else {
      return lead.type !== 'quote'; // chatbot leads (or unassigned old ones)
    }
  });

  // 2. Filter Leads by Search and Status
  const filteredLeads = baseLeads.filter((lead) => {
    const nameStr = lead.name || '';
    const emailStr = lead.email || '';
    const phoneStr = lead.phone || '';
    const companyStr = lead.company || '';
    const serviceStr = lead.service || '';

    const matchesSearch =
      nameStr.toLowerCase().includes(filterQuery.toLowerCase()) ||
      emailStr.toLowerCase().includes(filterQuery.toLowerCase()) ||
      phoneStr.toLowerCase().includes(filterQuery.toLowerCase()) ||
      companyStr.toLowerCase().includes(filterQuery.toLowerCase()) ||
      serviceStr.toLowerCase().includes(filterQuery.toLowerCase());

    const isNew = getIsNew(lead.timestamp);
    const matchesType =
      typeFilter === 'all' ||
      (typeFilter === 'new' && isNew) ||
      (typeFilter === 'standard' && !isNew) ||
      (typeFilter === 'status_new' && (lead.status === 'New' || !lead.status)) ||
      (typeFilter === 'status_progress' && lead.status === 'In Progress') ||
      (typeFilter === 'status_contacted' && lead.status === 'Contacted') ||
      (typeFilter === 'status_closed' && lead.status === 'Closed');

    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      {/* ─── Business Email Integration Panel ─── */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-3xl p-6 md:p-8 text-white shadow-md space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <MailCheck className="w-5 h-5 text-violet-200" />
              Connected Business Email ID Setup
            </h3>
            <p className="text-violet-100 text-xs max-w-2xl">
              Connect your business email address. When prospective clients fill out the <strong>"Request a Quote"</strong> form on the public site, this address will receive their detailed inquiries.
            </p>
          </div>
          {initialEmailLoaded && businessEmail && businessEmail.includes('@') && (
            <span className="self-start md:self-center inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-xs font-bold text-emerald-200 rounded-full border border-emerald-400/20">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
              Connection Active
            </span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 bg-white/10 p-3 rounded-2xl border border-white/10 max-w-xl">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/60">
              <Mail className="w-4 h-4" />
            </span>
            <input
              type="email"
              placeholder="sales@stonexindustrial.com"
              value={businessEmail}
              onChange={(e) => setBusinessEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/10 hover:bg-white/15 focus:bg-white/20 border border-white/15 rounded-xl text-sm outline-none transition-all placeholder:text-white/50 text-white font-semibold"
            />
          </div>
          <button
            onClick={handleSaveBusinessEmail}
            disabled={savingEmail}
            className="px-5 py-2.5 bg-white text-indigo-600 hover:bg-indigo-50 font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-75"
          >
            {savingEmail ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>Connect Email</span>
          </button>
        </div>
      </div>

      {/* ─── Dashboard Lead Section ─── */}
      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700 pb-5">
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2.5">
              <Users className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              Leads & Quote Requests
            </h2>
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
              Browse chatbot inquiries or manage detailed quote requests submitted by potential clients.
            </p>
          </div>

          <div className="flex items-center gap-2 text-right shrink-0">
            {onUpdateLead && (
              <button
                onClick={onUpdateLead}
                disabled={isLoading}
                className="p-1.5 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 transition-all disabled:opacity-50"
                title="Refresh Leads"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-violet-600' : ''}`} />
              </button>
            )}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-50 dark:bg-violet-950/40 text-xs font-black text-violet-600 dark:text-violet-400 rounded-full border border-violet-100/50 dark:border-violet-900/40">
              Filtered: {filteredLeads.length} / Total: {leads.length}
            </span>
          </div>
        </div>

        {/* ─── Sub-Tab Navigation ─── */}
        <div className="flex border-b border-slate-100 dark:border-slate-750/80 p-1 bg-slate-50 dark:bg-slate-900/50 rounded-2xl max-w-sm">
          <button
            onClick={() => { setLeadTypeTab('quote'); setFilterQuery(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              leadTypeTab === 'quote'
                ? 'bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            📄 Quote Requests ({leads.filter(l => l.type === 'quote').length})
          </button>
          <button
            onClick={() => { setLeadTypeTab('chatbot'); setFilterQuery(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              leadTypeTab === 'chatbot'
                ? 'bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            💬 Chatbot Leads ({leads.filter(l => l.type !== 'quote').length})
          </button>
        </div>

        {/* Filters Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder={leadTypeTab === 'quote' ? "Search by client name, company, service, email..." : "Search leads by name, email, or phone..."}
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-700 rounded-xl text-sm outline-none focus:bg-white focus:border-violet-500 transition-all text-slate-850 dark:text-white"
            />
          </div>

          <div className="relative shrink-0">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
              <Filter className="w-4 h-4" />
            </span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="pl-10 pr-8 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-violet-500 text-slate-850 dark:text-white cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="new">New Inquiries (&lt; 24h)</option>
              <option value="status_new">Status: New</option>
              <option value="status_progress">Status: In Progress</option>
              <option value="status_contacted">Status: Contacted</option>
              <option value="status_closed">Status: Closed</option>
            </select>
          </div>
        </div>

        {/* Table Section */}
        <div className="overflow-x-auto border border-slate-100 dark:border-slate-750 rounded-2xl bg-slate-50/50 dark:bg-slate-900/10">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              {leadTypeTab === 'quote' ? (
                // Headers for Quote Requests
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-150 dark:border-slate-750 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  <th className="px-6 py-4">Requester & Company</th>
                  <th className="px-6 py-4">Contact Info</th>
                  <th className="px-6 py-4">Requested Service</th>
                  <th className="px-6 py-4">Project Message</th>
                  <th className="px-6 py-4">Submitted At</th>
                  <th className="px-6 py-4">Status & Action</th>
                </tr>
              ) : (
                // Headers for Chatbot Leads
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-150 dark:border-slate-750 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  <th className="px-6 py-4">Client Name</th>
                  <th className="px-6 py-4">Contact Details</th>
                  <th className="px-6 py-4">Acquisition Channel</th>
                  <th className="px-6 py-4">Submission Time</th>
                  <th className="px-6 py-4">Lead Status Option</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-150 dark:divide-slate-750">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`} className="animate-pulse">
                    <td className="px-6 py-5">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-28"></div>
                    </td>
                    <td className="px-6 py-5 space-y-2">
                      <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded w-36"></div>
                      <div className="h-3 bg-slate-150 dark:bg-slate-800 rounded w-24"></div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="h-3.5 bg-slate-150 dark:bg-slate-800 rounded w-32"></div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="h-3.5 bg-slate-150 dark:bg-slate-800 rounded w-20"></div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="h-7 bg-slate-200 dark:bg-slate-700 rounded w-24"></div>
                    </td>
                  </tr>
                ))
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                    No matching {leadTypeTab === 'quote' ? 'quote requests' : 'chatbot leads'} discovered.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const isNew = getIsNew(lead.timestamp);
                  let formattedDate = 'Recent';
                  try {
                    formattedDate = new Date(lead.timestamp).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });
                  } catch (e) {
                    // Fallback
                  }

                  const isExpanded = expandedMessageId === lead.id;

                  // ──── CASE: QUOTE REQUESTS TAB ────
                  if (leadTypeTab === 'quote') {
                    return (
                      <tr
                        key={lead.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-900/30 transition-colors align-top"
                      >
                        {/* Name & Company */}
                        <td className="px-6 py-4 font-semibold text-slate-800 dark:text-white max-w-[180px]">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="break-words">{lead.name || 'Anonymous'}</span>
                              {isNew && (
                                <span className="px-1.5 py-0.5 bg-violet-600 text-[8px] font-extrabold uppercase text-white rounded-full tracking-wider leading-none">
                                  New
                                </span>
                              )}
                            </div>
                            {lead.company && (
                              <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500 text-xs font-medium">
                                <Building2 className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{lead.company}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Contact details */}
                        <td className="px-6 py-4 space-y-1">
                          {lead.email ? (
                            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-350 text-xs font-medium">
                              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <a href={`mailto:${lead.email}`} className="hover:underline hover:text-violet-500 truncate max-w-[160px]">{lead.email}</a>
                            </div>
                          ) : null}
                          {lead.phone ? (
                            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-450 text-xs">
                              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{lead.phone}</span>
                            </div>
                          ) : null}
                        </td>

                        {/* Requested Service */}
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400 text-xs font-semibold rounded-lg border border-violet-100/40 dark:border-violet-900/30 whitespace-nowrap">
                            <Briefcase className="w-3 h-3 text-violet-500" />
                            {lead.service ? lead.service.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Multiple Services'}
                          </span>
                        </td>

                        {/* Project Message (Expandable) */}
                        <td className="px-6 py-4 max-w-[240px]">
                          <div className="space-y-1.5">
                            <p className={`text-slate-600 dark:text-slate-300 text-xs leading-relaxed break-words ${isExpanded ? '' : 'line-clamp-2'}`}>
                              {lead.message || 'No project description attached.'}
                            </p>
                            {lead.message && lead.message.length > 50 && (
                              <button
                                onClick={() => setExpandedMessageId(isExpanded ? null : lead.id)}
                                className="text-[10px] font-black text-violet-600 dark:text-violet-400 flex items-center gap-0.5 hover:underline focus:outline-none"
                              >
                                {isExpanded ? (
                                  <>
                                    <span>Hide specifications</span>
                                    <ChevronUp className="w-3 h-3" />
                                  </>
                                ) : (
                                  <>
                                    <span>Read requirements</span>
                                    <ChevronDown className="w-3 h-3" />
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Submitted at */}
                        <td className="px-6 py-4 text-xs font-semibold text-slate-400 dark:text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{formattedDate}</span>
                          </div>
                        </td>

                        {/* Status dropdown */}
                        <td className="px-6 py-4">
                          {updatingLeadId === lead.id ? (
                            <div className="flex items-center gap-1 text-slate-400 text-xs">
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-600" />
                              <span>Saving...</span>
                            </div>
                          ) : (
                            <select
                              value={lead.status || 'New'}
                              onChange={(e) => handleUpdateStatus(lead.id, e.target.value as any)}
                              className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border outline-none cursor-pointer shadow-sm transition-all ${
                                lead.status === 'Closed'
                                  ? 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                                  : lead.status === 'Contacted'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40'
                                  : lead.status === 'In Progress'
                                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/40'
                                  : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/40'
                              }`}
                            >
                              <option value="New">🔵 New Request</option>
                              <option value="In Progress">🟡 In Progress</option>
                              <option value="Contacted">🟢 Contacted</option>
                              <option value="Closed">⚪ Closed</option>
                            </select>
                          )}
                        </td>
                      </tr>
                    );
                  }

                  // ──── CASE: CHATBOT LEADS TAB ────
                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-900/30 transition-colors align-top"
                    >
                      {/* Name */}
                      <td className="px-6 py-4 font-semibold text-slate-800 dark:text-white">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>{lead.name || 'Anonymous Contact'}</span>
                          {isNew && (
                            <span className="inline-block px-2 py-0.5 bg-violet-600 text-[9px] font-extrabold uppercase text-white rounded-full leading-none tracking-wider">
                              New
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Email / Phone */}
                      <td className="px-6 py-4 space-y-1">
                        {lead.email ? (
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-350">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[200px]">{lead.email}</span>
                          </div>
                        ) : null}
                        {lead.phone ? (
                          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-450 text-xs">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{lead.phone}</span>
                          </div>
                        ) : null}
                        {!lead.email && !lead.phone && (
                          <span className="text-slate-300 italic text-xs">No direct contacts provided</span>
                        )}
                      </td>

                      {/* Acquisition notes */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs">
                          <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Instant web-bot conversation</span>
                        </div>
                      </td>

                      {/* Timestamp */}
                      <td className="px-6 py-4 text-xs font-semibold text-slate-400 dark:text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{formattedDate}</span>
                        </div>
                      </td>

                      {/* Status Dropdown Option */}
                      <td className="px-6 py-4">
                        {updatingLeadId === lead.id ? (
                          <div className="flex items-center gap-1 text-slate-400 text-xs">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-600" />
                            <span>Saving...</span>
                          </div>
                        ) : (
                          <select
                            value={lead.status || 'New'}
                            onChange={(e) => handleUpdateStatus(lead.id, e.target.value as any)}
                            className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border outline-none cursor-pointer shadow-sm transition-all ${
                              lead.status === 'Closed'
                                ? 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                                : lead.status === 'Contacted'
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40'
                                : lead.status === 'In Progress'
                                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/40'
                                : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/40'
                            }`}
                          >
                            <option value="New">🔵 New Lead</option>
                            <option value="In Progress">🟡 In Progress</option>
                            <option value="Contacted">🟢 Contacted</option>
                            <option value="Closed">⚪ Closed</option>
                          </select>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
