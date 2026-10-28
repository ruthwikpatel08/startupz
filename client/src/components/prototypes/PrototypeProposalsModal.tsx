import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../common/Modal';
import { Avatar } from '../common/Avatar';
import { api } from '../../services/api';
import { supabase } from '../../lib/supabase';
import { Post, PrototypeProposal } from '../../types';
import {
  Users,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface PrototypeProposalsModalProps {
  prototype: Post | null;
  isOpen: boolean;
  onClose: () => void;
  onProposalUpdated?: () => void;
}

export const PrototypeProposalsModal: React.FC<PrototypeProposalsModalProps> = ({
  prototype,
  isOpen,
  onClose,
  onProposalUpdated,
}) => {
  const navigate = useNavigate();
  const [proposals, setProposals] = useState<PrototypeProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !prototype) return;

    const fetchProposals = async () => {
      setLoading(true);
      try {
        let loaded: any[] = [];

        // 1. Primary: Server API
        try {
          const res = await api.getPrototypeProposals(prototype.id);
          if (res && Array.isArray(res.proposals)) {
            loaded = res.proposals;
          }
        } catch (apiErr) {
          console.warn('API getPrototypeProposals notice:', apiErr);
        }

        // 2. Direct Supabase query fallback if API was empty
        if (loaded.length === 0) {
          try {
            const { data, error } = await supabase
              .from('prototype_proposals')
              .select('*')
              .eq('prototype_id', prototype.id)
              .order('created_at', { ascending: false });

            if (!error && Array.isArray(data) && data.length > 0) {
              const senderIds = [...new Set(data.map((d: any) => d.sender_id))];
              const { data: profiles } = await supabase
                .from('profiles')
                .select('*')
                .in('user_id', senderIds);
              const profMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

              loaded = data.map((d: any) => ({
                id: d.id,
                prototypeId: d.prototype_id,
                senderId: d.sender_id,
                receiverId: d.receiver_id,
                prototypeTitle: d.prototype_title,
                aboutBuilder: d.about_builder,
                contribution: d.contribution,
                contactInfo: d.contact_info,
                status: d.status || 'PENDING',
                createdAt: d.created_at,
                sender: {
                  id: d.sender_id,
                  email: '',
                  profile: profMap.get(d.sender_id) || null,
                },
              }));
            }
          } catch (supaErr) {
            console.warn('Supabase prototype proposals query error:', supaErr);
          }
        }

        setProposals(loaded);
      } catch (err) {
        console.error('Failed to load prototype proposals:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProposals();
  }, [isOpen, prototype?.id]);

  if (!prototype) return null;

  const handleUpdateStatus = async (proposalId: string, status: 'ACCEPTED' | 'DECLINED') => {
    setUpdatingId(proposalId);
    try {
      // 1. API update
      try {
        await api.updatePrototypeProposal(proposalId, status);
      } catch (apiErr) {
        // Direct Supabase update fallback
        await supabase
          .from('prototype_proposals')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', proposalId);
      }

      setProposals((prev) =>
        prev.map((p) => (p.id === proposalId ? { ...p, status } : p))
      );

      if (onProposalUpdated) onProposalUpdated();
    } catch (err) {
      console.error('Failed to update proposal status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleOpenChat = (senderId: string) => {
    onClose();
    navigate(`/messages?user=${senderId}`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Proposals for "${prototype.title || 'Prototype'}"`}
      maxWidth="xl"
    >
      <div className="space-y-4">
        {/* Header subtitle */}
        <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]  text-xs">
          <span className="text-[var(--text-muted)] ">
            Builders who submitted a "Build Together" proposal
          </span>
          <span className="font-bold text-[var(--brand-primary)] ">
            {proposals.length} {proposals.length === 1 ? 'Proposal' : 'Proposals'}
          </span>
        </div>

        {loading ? (
          <div className="space-y-3 py-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-28 rounded-xl bg-[var(--bg-soft)]  animate-pulse border border-[var(--border-subtle)] "
              />
            ))}
          </div>
        ) : proposals.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[var(--bg-soft)]  text-[var(--text-muted)] mx-auto flex items-center justify-center">
              <Users size={22} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[var(--text-primary)] ">
                No Proposals Received Yet
              </h4>
              <p className="text-xs text-[var(--text-muted)]  max-w-sm mx-auto mt-1">
                When other builders view your prototype and click <strong>"Build Together"</strong>, their introductions and proposals will appear here.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
            {proposals.map((prop) => {
              const sender = prop.sender;
              const senderName =
                sender?.profile?.fullName || sender?.email?.split('@')[0] || 'Interested Builder';
              const senderAvatar = sender?.profile?.avatar;
              const senderHeadline = sender?.profile?.headline || 'Startup Builder';

              const isAccepted = prop.status === 'ACCEPTED';
              const isDeclined = prop.status === 'DECLINED';

              return (
                <div
                  key={prop.id}
                  className="p-4 rounded-xl border border-[var(--border-subtle)]  bg-[var(--bg-surface)]  shadow-2xs space-y-3 transition-colors"
                >
                  {/* Proposer Info Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar src={senderAvatar} name={senderName} size="md" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[var(--text-primary)]  flex items-center gap-1.5 truncate">
                          <span>{senderName}</span>
                          {sender?.isVerified && (
                            <ShieldCheck size={13} className="text-[var(--brand-primary)] shrink-0" />
                          )}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)]  truncate">
                          {senderHeadline}
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">
                      {isAccepted ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle size={11} /> Accepted
                        </span>
                      ) : isDeclined ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                          <XCircle size={11} /> Declined
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                          <Clock size={11} /> Pending Review
                        </span>
                      )}
                    </div>
                  </div>

                  {/* About the Builder */}
                  <div className="p-2.5 rounded-lg bg-[var(--bg-primary)]  border border-[var(--border-subtle)]  text-xs">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                      About the Builder:
                    </div>
                    <p className="text-[var(--text-secondary)]  leading-relaxed whitespace-pre-wrap">
                      {prop.aboutBuilder}
                    </p>
                  </div>

                  {/* What they want to do */}
                  <div className="p-2.5 rounded-lg bg-[var(--brand-soft)]  border border-brand-100 dark:border-brand-900/60 text-xs">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand-primary)]  mb-1 flex items-center gap-1">
                      <Sparkles size={11} /> Proposed Contribution:
                    </div>
                    <p className="text-[var(--text-primary)]  leading-relaxed whitespace-pre-wrap">
                      {prop.contribution}
                    </p>
                  </div>

                  {/* Optional contact link */}
                  {prop.contactInfo && (
                    <div className="text-xs text-[var(--text-muted)]  flex items-center gap-1">
                      <span className="font-semibold text-[11px]">Links / Contact:</span>
                      {prop.contactInfo.startsWith('http') ? (
                        <a
                          href={prop.contactInfo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--brand-primary)]  hover:underline inline-flex items-center gap-1"
                        >
                          <span className="truncate max-w-xs">{prop.contactInfo}</span>
                          <ExternalLink size={11} />
                        </a>
                      ) : (
                        <span>{prop.contactInfo}</span>
                      )}
                    </div>
                  )}

                  {/* Actions footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]  gap-2">
                    <div className="text-[10px] text-[var(--text-muted)]">
                      {new Date(prop.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Direct Message button */}
                      <button
                        type="button"
                        onClick={() => handleOpenChat(prop.senderId)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--text-secondary)]  bg-[var(--bg-soft)]  hover:bg-[var(--bg-soft)] transition-colors cursor-pointer"
                      >
                        <MessageSquare size={13} />
                        <span>Chat</span>
                      </button>

                      {!isAccepted && (
                        <button
                          type="button"
                          disabled={updatingId === prop.id}
                          onClick={() => handleUpdateStatus(prop.id, 'ACCEPTED')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-colors cursor-pointer"
                        >
                          <CheckCircle size={13} />
                          <span>Accept</span>
                        </button>
                      )}

                      {!isDeclined && (
                        <button
                          type="button"
                          disabled={updatingId === prop.id}
                          onClick={() => handleUpdateStatus(prop.id, 'DECLINED')}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--text-muted)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        >
                          <XCircle size={13} />
                          <span>Decline</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-[var(--border-subtle)] ">
          <button type="button" onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
