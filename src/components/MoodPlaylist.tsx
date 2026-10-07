import React, { useState, useEffect } from 'react';
import { Music, Play, ExternalLink, ChevronDown, ChevronUp, Headphones } from 'lucide-react';

interface MoodPlaylistProps {
  dominantEmotion: string;
  isActive: boolean;
}

interface Track {
  title: string;
  artist: string;
  youtubeUrl: string;
  spotifyUrl?: string;
  duration: string;
  vibe: string;
}

interface PlaylistData {
  label: string;
  description: string;
  color: string;
  gradient: string;
  tracks: Track[];
}

const MOOD_PLAYLISTS: Record<string, PlaylistData> = {
  happy: {
    label: '😊 Happy Vibes',
    description: 'Energetic & Upbeat tracks for your joyful mood!',
    color: '#10b981',
    gradient: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(6,182,212,0.1))',
    tracks: [
      { title: 'Happy', artist: 'Pharrell Williams', youtubeUrl: 'https://www.youtube.com/watch?v=ZbZSe6N_BXs', duration: '3:53', vibe: '🎉 Feel-Good' },
      { title: 'Can\'t Stop the Feeling', artist: 'Justin Timberlake', youtubeUrl: 'https://www.youtube.com/watch?v=ru0K8uYEZWw', duration: '3:56', vibe: '💃 Dance' },
      { title: 'Good as Hell', artist: 'Lizzo', youtubeUrl: 'https://www.youtube.com/watch?v=SmbmeOgGsOc', duration: '2:39', vibe: '✨ Empowering' },
      { title: 'Shake It Off', artist: 'Taylor Swift', youtubeUrl: 'https://www.youtube.com/watch?v=nfWlot6h_JM', duration: '3:39', vibe: '🎵 Pop' },
      { title: 'Uptown Funk', artist: 'Mark Ronson ft. Bruno Mars', youtubeUrl: 'https://www.youtube.com/watch?v=OPf0YbXqDm0', duration: '4:30', vibe: '🕺 Funk' },
    ],
  },
  sad: {
    label: '💙 Soothing Soul',
    description: 'Calming & healing music for emotional moments.',
    color: '#6366f1',
    gradient: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.1))',
    tracks: [
      { title: 'Someone Like You', artist: 'Adele', youtubeUrl: 'https://www.youtube.com/watch?v=hLQl3WQQoQ0', duration: '4:45', vibe: '💔 Emotional' },
      { title: 'Fix You', artist: 'Coldplay', youtubeUrl: 'https://www.youtube.com/watch?v=k4V3Mo61fJM', duration: '4:55', vibe: '🌧️ Healing' },
      { title: 'Let Her Go', artist: 'Passenger', youtubeUrl: 'https://www.youtube.com/watch?v=RBumgq5yVrA', duration: '4:14', vibe: '🍂 Melancholic' },
      { title: 'Skinny Love', artist: 'Bon Iver', youtubeUrl: 'https://www.youtube.com/watch?v=ssdgFoHLwnk', duration: '3:58', vibe: '🌙 Indie' },
      { title: 'The Night Will Always Win', artist: 'Manchester Orchestra', youtubeUrl: 'https://www.youtube.com/watch?v=LCK_fDwCIkU', duration: '5:10', vibe: '🎸 Rock' },
    ],
  },
  angry: {
    label: '❄️ Calm Down',
    description: 'Meditative & relaxing tracks to ease your mind.',
    color: '#ef4444',
    gradient: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(245,158,11,0.1))',
    tracks: [
      { title: 'Weightless', artist: 'Marconi Union', youtubeUrl: 'https://www.youtube.com/watch?v=UfcAVejslrU', duration: '8:10', vibe: '🧘 Calming' },
      { title: 'Clair de Lune', artist: 'Debussy', youtubeUrl: 'https://www.youtube.com/watch?v=CvFH_6DNRCY', duration: '5:07', vibe: '🎹 Classical' },
      { title: 'Breath (2 AM)', artist: 'Anna Nalick', youtubeUrl: 'https://www.youtube.com/watch?v=0Mre3-PZRkQ', duration: '3:39', vibe: '🌬️ Soothing' },
      { title: 'Pure Shores', artist: 'All Saints', youtubeUrl: 'https://www.youtube.com/watch?v=oI5GnoRi08Q', duration: '4:31', vibe: '🌊 Ambient' },
      { title: 'Cold Water', artist: 'Major Lazer ft. Justin Bieber', youtubeUrl: 'https://www.youtube.com/watch?v=6Cp6mKbRTQY', duration: '3:44', vibe: '💧 Chill' },
    ],
  },
  surprised: {
    label: '✨ Wow Factor',
    description: 'Exciting & motivational tracks for your energized state!',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(16,185,129,0.1))',
    tracks: [
      { title: 'Eye of the Tiger', artist: 'Survivor', youtubeUrl: 'https://www.youtube.com/watch?v=btPJPFnesV4', duration: '4:04', vibe: '🏆 Power' },
      { title: 'Roar', artist: 'Katy Perry', youtubeUrl: 'https://www.youtube.com/watch?v=CevxZvSJLk8', duration: '3:43', vibe: '🦁 Fierce' },
      { title: 'Stronger', artist: 'Kanye West', youtubeUrl: 'https://www.youtube.com/watch?v=PsO6ZnUZI0g', duration: '5:11', vibe: '💪 Hype' },
      { title: 'Adventure of a Lifetime', artist: 'Coldplay', youtubeUrl: 'https://www.youtube.com/watch?v=QtXby3twMmI', duration: '4:23', vibe: '🚀 Epic' },
      { title: 'Hall of Fame', artist: 'The Script ft. will.i.am', youtubeUrl: 'https://www.youtube.com/watch?v=mk48xRzuNvA', duration: '3:21', vibe: '🎯 Motivating' },
    ],
  },
  fearful: {
    label: '🧘 Peace & Calm',
    description: 'Grounding & peaceful music to ease anxiety.',
    color: '#ec4899',
    gradient: 'linear-gradient(135deg, rgba(236,72,153,0.15), rgba(139,92,246,0.1))',
    tracks: [
      { title: 'Breathe (2 AM)', artist: 'Anna Nalick', youtubeUrl: 'https://www.youtube.com/watch?v=0Mre3-PZRkQ', duration: '3:39', vibe: '🌬️ Peaceful' },
      { title: 'The Sound of Silence', artist: 'Simon & Garfunkel', youtubeUrl: 'https://www.youtube.com/watch?v=4zLfCnGVeL4', duration: '3:05', vibe: '🌙 Gentle' },
      { title: 'Porcelain', artist: 'Moby', youtubeUrl: 'https://www.youtube.com/watch?v=gfmwjHp3h_w', duration: '3:48', vibe: '🫧 Ambient' },
      { title: 'Everything in Its Right Place', artist: 'Radiohead', youtubeUrl: 'https://www.youtube.com/watch?v=onRk0sjSgFU', duration: '4:11', vibe: '🎸 Alt' },
      { title: 'Ocean', artist: 'John Butler Trio', youtubeUrl: 'https://www.youtube.com/watch?v=yMnpPEhQMnU', duration: '12:20', vibe: '🌊 Guitar' },
    ],
  },
  disgusted: {
    label: '🌟 Refresh & Reset',
    description: 'Uplifting music to clear your mind and start fresh.',
    color: '#14b8a6',
    gradient: 'linear-gradient(135deg, rgba(20,184,166,0.2), rgba(6,182,212,0.1))',
    tracks: [
      { title: 'Beautiful Day', artist: 'U2', youtubeUrl: 'https://www.youtube.com/watch?v=co6WMzDOh1o', duration: '4:05', vibe: '☀️ Positive' },
      { title: 'Walking on Sunshine', artist: 'Katrina & The Waves', youtubeUrl: 'https://www.youtube.com/watch?v=iPUmE-tne5U', duration: '3:57', vibe: '🌞 Upbeat' },
      { title: 'Good Life', artist: 'OneRepublic', youtubeUrl: 'https://www.youtube.com/watch?v=jZhQOvvV45w', duration: '4:14', vibe: '✨ Fresh' },
      { title: 'Count on Me', artist: 'Bruno Mars', youtubeUrl: 'https://www.youtube.com/watch?v=qqONTcVpIDY', duration: '3:19', vibe: '🤝 Friendly' },
      { title: 'Best Day of My Life', artist: 'American Authors', youtubeUrl: 'https://www.youtube.com/watch?v=Y66j_BUCBMY', duration: '3:14', vibe: '🎊 Joyful' },
    ],
  },
  neutral: {
    label: '🎯 Focus Flow',
    description: 'Deep focus & concentration music for productive work.',
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(6,182,212,0.1))',
    tracks: [
      { title: 'Experience', artist: 'Ludovico Einaudi', youtubeUrl: 'https://www.youtube.com/watch?v=hN_q-_nGv4U', duration: '5:13', vibe: '🧠 Focus' },
      { title: 'Comptine d\'un autre été', artist: 'Yann Tiersen', youtubeUrl: 'https://www.youtube.com/watch?v=lNMHGfNbAFo', duration: '2:25', vibe: '🎹 Piano' },
      { title: 'Divenire', artist: 'Ludovico Einaudi', youtubeUrl: 'https://www.youtube.com/watch?v=6RNnKa3FQLU', duration: '8:16', vibe: '🌊 Deep' },
      { title: 'Intro', artist: 'The xx', youtubeUrl: 'https://www.youtube.com/watch?v=xMV6B2OOKHE', duration: '2:08', vibe: '✨ Ambient' },
      { title: 'Strobe', artist: 'deadmau5', youtubeUrl: 'https://www.youtube.com/watch?v=tKi9Z-f6qX4', duration: '10:37', vibe: '⚡ Electronic' },
    ],
  },
};

export const MoodPlaylist: React.FC<MoodPlaylistProps> = ({ dominantEmotion, isActive }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const playlist = MOOD_PLAYLISTS[dominantEmotion] || MOOD_PLAYLISTS.neutral;

  // Auto-expand when emotion changes significantly
  useEffect(() => {
    if (isActive && dominantEmotion && dominantEmotion !== 'neutral') {
      setIsExpanded(true);
    }
  }, [dominantEmotion, isActive]);

  return (
    <div
      className="glass-panel"
      style={{
        background: playlist.gradient,
        border: `1px solid ${playlist.color}30`,
        overflow: 'hidden',
        transition: 'all 0.3s ease',
      }}
    >
      {/* Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          padding: '1rem 1.25rem',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            background: `${playlist.color}25`,
            border: `1px solid ${playlist.color}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Headphones size={18} color={playlist.color} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
              {playlist.label}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {playlist.description}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{
            fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px',
            borderRadius: '10px', background: `${playlist.color}20`,
            color: playlist.color,
          }}>
            {playlist.tracks.length} tracks
          </span>
          {isExpanded ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
        </div>
      </div>

      {/* Track List */}
      {isExpanded && (
        <div style={{ borderTop: `1px solid ${playlist.color}20` }}>
          {playlist.tracks.map((track, i) => (
            <div
              key={i}
              style={{
                padding: '0.65rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                borderBottom: i < playlist.tracks.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                transition: 'background 0.15s ease',
                cursor: 'default',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {/* Track Number */}
              <div style={{ width: '20px', textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                {i + 1}
              </div>

              {/* Music icon */}
              <div style={{
                width: '36px', height: '36px', borderRadius: '8px',
                background: `${playlist.color}15`,
                border: `1px solid ${playlist.color}25`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Music size={14} color={playlist.color} />
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {track.title}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {track.artist} • {track.duration}
                </div>
              </div>

              {/* Vibe Badge */}
              <span style={{
                fontSize: '0.65rem', padding: '2px 7px',
                borderRadius: '10px', background: `${playlist.color}15`,
                color: playlist.color, fontWeight: 700, flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: '2px',
              }}>
                {track.vibe}
              </span>

              {/* YouTube Play Button */}
              <a
                href={track.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  width: '30px', height: '30px', borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#ef4444', textDecoration: 'none', flexShrink: 0,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.35)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.15)'; }}
                title={`Play on YouTube: ${track.title}`}
              >
                <Play size={12} fill="#ef4444" />
              </a>
            </div>
          ))}

          {/* Quick YouTube Search Link */}
          <div style={{ padding: '0.75rem 1.25rem', borderTop: `1px solid ${playlist.color}15` }}>
            <a
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(playlist.label.replace(/[^a-zA-Z0-9 ]/g, ''))}+music`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                padding: '0.5rem', borderRadius: '8px',
                background: `${playlist.color}10`,
                border: `1px solid ${playlist.color}25`,
                color: playlist.color, textDecoration: 'none',
                fontSize: '0.75rem', fontWeight: 700,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${playlist.color}20`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${playlist.color}10`; }}
            >
              🎵 Search more on YouTube <ExternalLink size={11} />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
