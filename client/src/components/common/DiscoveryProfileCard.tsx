import { Link } from 'react-router-dom';
import { ArrowUpRight, Check, Sparkles } from 'lucide-react';
import { Avatar } from './Avatar';
import { RoleBadge } from './Badge';
import './DiscoveryProfileCard.css';

interface DiscoveryProfileCardProps {
  name: string;
  username: string;
  avatar?: string | null;
  role: string;
  topSkill: string | null;
  bio: string;
  profileUrl: string;
  connectionStatus?: string;
  onCollaborate: () => void;
  onConnect: () => void;
}

export function DiscoveryProfileCard({
  name, username, avatar, role, topSkill, bio, profileUrl,
  connectionStatus, onCollaborate, onConnect,
}: DiscoveryProfileCardProps) {
  return (
    <article className="card-base discovery-profile-card" aria-label={`${name}'s profile`}>
      <div className="discovery-profile-identity">
        <Link to={profileUrl} className="discovery-profile-avatar" aria-label={`See ${name}'s profile`}>
          <Avatar src={avatar} name={name} size="xl" />
        </Link>
        <div className="min-w-0">
          <Link to={profileUrl} className="discovery-profile-name line-clamp-2" title={name}>{name}</Link>
          <p className="discovery-profile-handle truncate" title={`@${username}`}>@{username}</p>
        </div>
      </div>
      <div className="discovery-profile-badges">
        <RoleBadge role={role} size="sm" />
        {topSkill && (
          <span className="discovery-profile-skill" title={`Top skill: ${topSkill}`}>
            <Sparkles size={13} aria-hidden="true" />
            <span className="sr-only">Top skill: </span><span className="truncate">{topSkill}</span>
          </span>
        )}
      </div>
      <p className="discovery-profile-bio line-clamp-2">{bio || 'No bio added yet.'}</p>
      <div className="discovery-profile-actions">
        <Link to={profileUrl} className="discovery-profile-link">
          See Profile <ArrowUpRight size={13} aria-hidden="true" />
        </Link>
        <button type="button" className="btn-secondary" onClick={onCollaborate} title="Propose a collaboration">Collaborate</button>
        {connectionStatus === 'ACCEPTED' ? (
          <span className="discovery-profile-status discovery-profile-connected"><Check size={13} aria-hidden="true" /> Connected</span>
        ) : connectionStatus === 'PENDING' ? (
          <span className="discovery-profile-status discovery-profile-pending">Pending</span>
        ) : (
          <button type="button" className="btn-primary" onClick={onConnect}>+ Connect</button>
        )}
      </div>
    </article>
  );
}
