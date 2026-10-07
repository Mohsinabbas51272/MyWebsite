import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Search,
  Mail,
  CheckCircle2,
  Trash2,
  Edit2,
  X,
  Building
} from 'lucide-react';
import type { TeamMember, TeamRole } from '../types/dashboard';
import { api } from '../services/api';

export const TeamView: React.FC<{ onShowToast: (msg: string) => void }> = ({ onShowToast }) => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [search, setSearch] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState<boolean>(false);
  const [selectedMemberToEdit, setSelectedMemberToEdit] = useState<TeamMember | null>(null);

  // Load live team members from PostgreSQL
  useEffect(() => {
    api.getTeam().then((data) => {
      if (data && data.length > 0) setMembers(data);
    }).catch((err) => console.warn('Team DB load notice:', err));
  }, []);

  // Invite Form State
  const [inviteName, setInviteName] = useState<string>('');
  const [inviteEmail, setInviteEmail] = useState<string>('');
  const [inviteRole, setInviteRole] = useState<TeamRole>('Fullstack Engineer');
  const [inviteDept, setInviteDept] = useState<string>('Engineering');

  const filteredMembers = members.filter((m) => {
    const matchesRole = roleFilter === 'all' || m.role === roleFilter;
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      m.department.toLowerCase().includes(search.toLowerCase()) ||
      m.role.toLowerCase().includes(search.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) {
      onShowToast('Please fill out all required invitation fields.');
      return;
    }

    const newMember: TeamMember = {
      id: `team-${Date.now()}`,
      name: inviteName.trim(),
      email: inviteEmail.trim(),
      role: inviteRole,
      department: inviteDept,
      avatar: `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random() * 500)}?w=150`,
      status: 'active',
      twoFactorEnabled: true,
      lastActive: 'Just invited',
      joinedDate: 'Aug 2026',
    };

    setMembers((prev) => [newMember, ...prev]);
    setIsInviteModalOpen(false);
    setInviteName('');
    setInviteEmail('');
    onShowToast(`Invitation sent to ${newMember.email} as ${newMember.role}!`);
    try {
      await api.createTeamMember(newMember);
    } catch (err) {
      console.error('Failed to create team member in DB:', err);
    }
  };

  const handleRemoveMember = async (id: string, name: string) => {
    if (members.length <= 1) {
      onShowToast('Cannot remove the primary workspace owner.');
      return;
    }
    setMembers((prev) => prev.filter((m) => m.id !== id));
    onShowToast(`Removed team member: ${name}`);
    try {
      await api.deleteTeamMember(id);
    } catch (err) {
      console.error('Failed to delete team member from DB:', err);
    }
  };

  const handleUpdateRole = (id: string, newRole: TeamRole) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, role: newRole } : m))
    );
    setSelectedMemberToEdit(null);
    onShowToast('Permissions and role access updated successfully.');
  };

  const getRoleBadge = (role: TeamRole) => {
    switch (role) {
      case 'Owner':
        return (
          <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            <ShieldAlert size={12} /> Owner
          </span>
        );
      case 'Admin':
      case 'DevOps Lead':
        return (
          <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-purple)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
            <ShieldCheck size={12} /> {role}
          </span>
        );
      default:
        return (
          <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-blue)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
            <Shield size={12} /> {role}
          </span>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner */}
      <div className="welcome-banner" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(236, 72, 153, 0.15) 100%)', borderColor: 'rgba(139, 92, 246, 0.3)' }}>
        <div className="welcome-text">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
              <Users size={12} /> Team Access Control
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>RBAC Security Active</span>
          </div>
          <h1>Team Directory & Permission Management</h1>
          <p>
            Manage role-based access control (RBAC), security credentials, 2FA status, and multi-factor compliance across engineers and designers.
          </p>
        </div>

        <div className="banner-actions">
          <button className="btn-primary" onClick={() => setIsInviteModalOpen(true)}>
            <UserPlus size={15} /> Invite Teammate
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="kpi-grid">
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Active Seats</span>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, marginTop: '0.35rem', color: 'var(--text-primary)' }}>
            {members.length} / 25
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>Enterprise Plan (19 seats free)</span>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>2FA Enforcement</span>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, marginTop: '0.35rem', color: 'var(--accent-purple)' }}>
            {Math.round((members.filter((m) => m.twoFactorEnabled).length / members.length) * 100)}%
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SOC-2 Type II Compliant</span>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Engineers Active</span>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, marginTop: '0.35rem', color: 'var(--accent-cyan)' }}>
            {members.filter((m) => m.department.toLowerCase().includes('eng') || m.department.toLowerCase().includes('infra')).length} Engineers
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Across 3 regional clusters</span>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Security Compliance</span>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, marginTop: '0.35rem', color: 'var(--accent-emerald)' }}>
            100% Passed
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>All audits passed without warnings</span>
        </div>
      </div>

      {/* Main Members Directory */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Filter and Search Bar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', background: 'var(--bg-input)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
            {['all', 'Owner', 'DevOps Lead', 'Fullstack Engineer', 'Product Designer', 'Security Analyst'].map((rf) => (
              <button
                key={rf}
                onClick={() => setRoleFilter(rf)}
                style={{
                  border: 'none',
                  padding: '0.35rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: roleFilter === rf ? 'var(--bg-secondary)' : 'transparent',
                  color: roleFilter === rf ? 'var(--accent-purple)' : 'var(--text-secondary)',
                  transition: 'all var(--transition-fast)',
                }}
              >
                {rf === 'all' ? 'All Roles' : rf}
              </button>
            ))}
          </div>

          <div style={{ position: 'relative', minWidth: '280px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search team member by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 1rem 0.55rem 2.2rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Team Members List */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Member</th>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Role</th>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Department</th>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>2FA Security</th>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Last Active</th>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member) => (
                <tr
                  key={member.id}
                  style={{
                    borderBottom: '1px solid var(--border-color)',
                    transition: 'background var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Member Name & Avatar */}
                  <td style={{ padding: '0.85rem 0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ position: 'relative' }}>
                        <img
                          src={member.avatar}
                          alt={member.name}
                          style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <span
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            backgroundColor:
                              member.status === 'active'
                                ? 'var(--accent-emerald)'
                                : member.status === 'away'
                                ? 'var(--accent-amber)'
                                : 'var(--text-muted)',
                            border: '2px solid var(--bg-secondary)',
                          }}
                        />
                      </div>
                      <div>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>
                          {member.name}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{member.email}</span>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td style={{ padding: '0.85rem 0.5rem' }}>{getRoleBadge(member.role)}</td>

                  {/* Department */}
                  <td style={{ padding: '0.85rem 0.5rem', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Building size={14} style={{ color: 'var(--text-muted)' }} />
                      <span>{member.department}</span>
                    </div>
                  </td>

                  {/* 2FA */}
                  <td style={{ padding: '0.85rem 0.5rem' }}>
                    {member.twoFactorEnabled ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent-emerald)', fontSize: '0.8rem', fontWeight: 600 }}>
                        <ShieldCheck size={15} /> Enabled
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent-rose)', fontSize: '0.8rem', fontWeight: 600 }}>
                        <ShieldAlert size={15} /> Missing
                      </span>
                    )}
                  </td>

                  {/* Last Active */}
                  <td style={{ padding: '0.85rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {member.lastActive}
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '0.85rem 0.5rem', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                      <button
                        className="btn-icon"
                        style={{ width: '30px', height: '30px' }}
                        title="Edit Permissions"
                        onClick={() => setSelectedMemberToEdit(member)}
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        className="btn-icon"
                        style={{ width: '30px', height: '30px', color: 'var(--accent-rose)' }}
                        title="Revoke Member Access"
                        onClick={() => handleRemoveMember(member.id, member.name)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Invite Teammate */}
      {isInviteModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserPlus size={20} style={{ color: 'var(--accent-purple)' }} /> Invite New Team Member
              </h3>
              <button className="btn-icon" style={{ width: '30px', height: '30px' }} onClick={() => setIsInviteModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSendInvite} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alex Morgan"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Work Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. alex@apex.io"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Assigned Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as TeamRole)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  >
                    <option value="Admin">Admin</option>
                    <option value="DevOps Lead">DevOps Lead</option>
                    <option value="Fullstack Engineer">Fullstack Engineer</option>
                    <option value="Product Designer">Product Designer</option>
                    <option value="Security Analyst">Security Analyst</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Department
                  </label>
                  <select
                    value={inviteDept}
                    onChange={(e) => setInviteDept(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Infrastructure & SRE">Infrastructure & SRE</option>
                    <option value="Product & Design">Product & Design</option>
                    <option value="InfoSec & Security">InfoSec & Security</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsInviteModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  <Mail size={16} /> Send Workspace Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Member Permissions */}
      {selectedMemberToEdit && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Edit Permissions: {selectedMemberToEdit.name}
              </h3>
              <button className="btn-icon" style={{ width: '30px', height: '30px' }} onClick={() => setSelectedMemberToEdit(null)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Change Role Access</label>
              {(['Admin', 'DevOps Lead', 'Fullstack Engineer', 'Product Designer', 'Security Analyst'] as TeamRole[]).map((r) => (
                <div
                  key={r}
                  onClick={() => handleUpdateRole(selectedMemberToEdit.id, r)}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    background: selectedMemberToEdit.role === r ? 'rgba(139, 92, 246, 0.15)' : 'var(--bg-input)',
                    border: selectedMemberToEdit.role === r ? '2px solid var(--accent-purple)' : '1px solid var(--border-color)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{r}</span>
                  {selectedMemberToEdit.role === r && <CheckCircle2 size={16} style={{ color: 'var(--accent-purple)' }} />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
