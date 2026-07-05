"use client";

import {
  CheckCircle2,
  Clock3,
  Compass,
  Headphones,
  Heart,
  Home,
  Library,
  ListMusic,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Search,
  Settings,
  SkipBack,
  SkipForward,
  Sparkles,
  Upload,
  Volume2,
  X,
} from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Book = {
  id: number;
  title: string;
  author: string;
  description: string;
  duration: string;
  category: string;
  color: string;
  accent: string;
  audio?: string;
};

const starterBooks: Book[] = [
  {
    id: 8,
    title: "The 48 Laws of Power",
    author: "Robert Greene",
    description: "A concise audio summary of the book's principles for understanding power, influence, strategy, and human behavior.",
    duration: "6m",
    category: "Psychology",
    color: "#e7e1d4",
    accent: "#9f241f",
    audio: "https://zsgawbhig8vm8wtj.public.blob.vercel-storage.com/audiobooks/the-48-laws-of-power-summary.mp3",
  },
  {
    id: 7,
    title: "Staff Engineer",
    author: "Will Larson",
    description: "An audio summary about the paths, responsibilities, and practical leadership work of staff-plus engineers.",
    duration: "1h 43m",
    category: "Engineering",
    color: "#4b2828",
    accent: "#f0c795",
    audio: "https://zsgawbhig8vm8wtj.public.blob.vercel-storage.com/audiobooks/staff-engineer-summary.mp3",
  },
];

function Cover({ book, large = false }: { book: Book; large?: boolean }) {
  return (
    <div className={`cover ${large ? "cover-large" : ""}`} style={{ background: book.color, color: book.accent }}>
      <span className="cover-mark">{book.id % 3 === 0 ? "✦" : book.id % 2 === 0 ? "◐" : "✺"}</span>
      <div>
        <span className="cover-title">{book.title}</span>
        <span className="cover-author">{book.author}</span>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [books, setBooks] = useState(starterBooks);
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [rankedIds, setRankedIds] = useState<number[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Book>(starterBooks[0]);
  const [playing, setPlaying] = useState(false);
  const [liked, setLiked] = useState<number[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [toast, setToast] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.75);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) void audio.play().catch(() => setPlaying(false));
    else audio.pause();
  }, [playing, selected.audio]);

  const results = useMemo(() => {
    if (!activeQuery.trim()) return books;
    if (rankedIds.length) {
      const rank = new Map(rankedIds.map((id, index) => [id, index]));
      return [...books].sort((a, b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999));
    }
    const words = activeQuery.toLowerCase().split(/\s+/);
    return [...books].sort((a, b) => {
      const score = (book: Book) => words.reduce((sum, word) => sum + ( `${book.title} ${book.author} ${book.description} ${book.category}`.toLowerCase().includes(word) ? 1 : 0), 0);
      return score(b) - score(a);
    });
  }, [activeQuery, books, rankedIds]);

  async function search(event: FormEvent) {
    event.preventDefault();
    const nextQuery = query.trim();
    if (!nextQuery) return;
    setActiveQuery(nextQuery);
    setRankedIds([]);
    setSearching(true);

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: nextQuery,
          books: books.map(({ id, title, author, description, category }) => ({
            id, title, author, description, category,
          })),
        }),
      });
      if (!response.ok) throw new Error("Search failed");
      const data = (await response.json()) as { ids: number[] };
      setRankedIds(data.ids);
    } catch {
      setToast("Using local search while semantic search is unavailable.");
      setTimeout(() => setToast(""), 3500);
    } finally {
      setSearching(false);
    }
  }

  function togglePlay(book = selected) {
    if (!book.audio) {
      setToast("This preview has no audio yet.");
      setTimeout(() => setToast(""), 3000);
      return;
    }
    if (book.id !== selected.id) {
      setSelected(book);
      setPlaying(true);
      return;
    }
    setPlaying((value) => !value);
  }

  function skip(seconds: number) {
    const audio = audioRef.current;
    if (!audio || !selected.audio) return;
    audio.currentTime = Math.min(Math.max(audio.currentTime + seconds, 0), audio.duration || 0);
  }

  function seek(value: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value;
    setCurrentTime(value);
  }

  function changeVolume(value: number) {
    const audio = audioRef.current;
    setVolume(value);
    setMuted(value === 0);
    if (audio) {
      audio.volume = value;
      audio.muted = value === 0;
    }
  }

  function toggleMute() {
    const nextMuted = !muted;
    setMuted(nextMuted);
    if (audioRef.current) audioRef.current.muted = nextMuted;
  }

  function cyclePlaybackRate() {
    const rates = [1, 1.25, 1.5, 1.75, 2, 0.75];
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) audioRef.current.playbackRate = nextRate;
  }

  function uploadBook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (!uploadedFile) return;
    const newBook: Book = {
      id: Date.now(),
      title: String(data.get("title")),
      author: String(data.get("author")),
      description: String(data.get("description")),
      category: "Community",
      duration: "New",
      color: "#5b3e7b",
      accent: "#f4d4a5",
      audio: URL.createObjectURL(uploadedFile),
    };
    setBooks((current) => [newBook, ...current]);
    setSelected(newBook);
    setShowUpload(false);
    setUploadedFile(null);
    setToast("Your audiobook is now in the library.");
    setTimeout(() => setToast(""), 3500);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-icon"><Headphones size={19} /></span><span>Audora</span></div>
        <nav>
          <p>Discover</p>
          <button className="active"><Home size={18} /> Home</button>
          <button><Compass size={18} /> Explore</button>
          <button><Sparkles size={18} /> For you</button>
          <p>Your library</p>
          <button><Library size={18} /> My books</button>
          <button><Heart size={18} /> Favorites</button>
          <button><Clock3 size={18} /> Listening history</button>
        </nav>
        <div className="sidebar-bottom">
          <button><Settings size={18} /> Settings</button>
          <div className="profile"><span>HP</span><div><strong>Hamza</strong><small>Free listener</small></div><MoreHorizontal size={18} /></div>
        </div>
      </aside>

      <section className="content">
        <header>
          <form className="search" onSubmit={search}>
            <Search size={20} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Describe what you want to listen to..." />
            {query && <button type="button" onClick={() => { setQuery(""); setActiveQuery(""); setRankedIds([]); }}><X size={17} /></button>}
            <kbd>⌘ K</kbd>
          </form>
          <button className="upload-button" onClick={() => setShowUpload(true)}><Plus size={18} /> Add audiobook</button>
        </header>

        <div className="page">
          <section className="hero">
            <div className="eyebrow"><Sparkles size={14} /> A library that understands you</div>
            <h1>What story are you<br /><em>in the mood for?</em></h1>
            <p>Search by feeling, theme, or idea. We&apos;ll find the stories that fit.</p>
            <form className="hero-search" onSubmit={search}>
              <Search size={21} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder='Try "an inspiring story about starting over"' />
              <button disabled={searching}>{searching ? "Searching…" : "Find my next listen"} <span>→</span></button>
            </form>
            <div className="suggestions"><span>Try a mood:</span>{["Cozy & comforting", "Mind-bending", "Learn something new", "Epic adventure"].map((item) => <button key={item} onClick={() => { setQuery(item); setActiveQuery(item); }}>{item}</button>)}</div>
          </section>

          <section className="library-section">
            <div className="section-heading">
              <div><h2>{searching ? "Finding your stories…" : activeQuery ? "Matches for you" : "Popular right now"}</h2><p>{activeQuery ? `Books related to “${activeQuery}”` : "Stories everyone is talking about"}</p></div>
              <button>View all <span>→</span></button>
            </div>
            <div className="book-grid">
              {results.map((book) => (
                <article className="book-card" key={book.id}>
                  <div className="cover-wrap" onClick={() => setSelected(book)}>
                    <Cover book={book} />
                    <button className="card-play" onClick={(e) => { e.stopPropagation(); togglePlay(book); }}>{playing && selected.id === book.id ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}</button>
                  </div>
                  <div className="book-meta"><h3>{book.title}</h3><button onClick={() => setLiked((items) => items.includes(book.id) ? items.filter((id) => id !== book.id) : [...items, book.id])}><Heart size={18} fill={liked.includes(book.id) ? "currentColor" : "none"} /></button></div>
                  <p>{book.author}</p>
                  <span><Headphones size={13} /> {book.duration}</span>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>

      <div className="player">
        <div className="now-playing"><Cover book={selected} /><div><small>NOW PLAYING</small><strong>{selected.title}</strong><span>{selected.author}</span></div><button onClick={() => setLiked((items) => items.includes(selected.id) ? items.filter((id) => id !== selected.id) : [...items, selected.id])}><Heart size={18} fill={liked.includes(selected.id) ? "currentColor" : "none"} /></button></div>
        <div className="player-center">
          <div className="controls">
            <button onClick={() => skip(-15)} title="Back 15 seconds" disabled={!selected.audio}><SkipBack size={19} /><small>15</small></button>
            <button className="play-main" onClick={() => togglePlay()} disabled={!selected.audio} title={playing ? "Pause" : "Play"}>{playing ? <Pause fill="currentColor" size={20} /> : <Play fill="currentColor" size={20} />}</button>
            <button onClick={() => skip(15)} title="Forward 15 seconds" disabled={!selected.audio}><SkipForward size={19} /><small>15</small></button>
          </div>
          <div className="timeline">
            <span>{formatTime(currentTime)}</span>
            <input
              aria-label="Seek through audiobook"
              type="range"
              min="0"
              max={duration || 0}
              step="1"
              value={Math.min(currentTime, duration || 0)}
              onInput={(event) => seek(Number(event.currentTarget.value))}
              onChange={(event) => seek(Number(event.currentTarget.value))}
              disabled={!duration}
              style={{ "--progress": `${duration ? (currentTime / duration) * 100 : 0}%` } as React.CSSProperties}
            />
            <span>-{formatTime(Math.max(duration - currentTime, 0))}</span>
          </div>
        </div>
        <div className="player-actions">
          <button onClick={cyclePlaybackRate} title="Change playback speed" disabled={!selected.audio}>{playbackRate}×</button>
          <button onClick={() => setShowQueue((value) => !value)} title="Open listening queue"><ListMusic size={19} /></button>
          <button onClick={toggleMute} title={muted ? "Unmute" : "Mute"}><Volume2 size={19} /></button>
          <input aria-label="Volume" className="volume" type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume} onChange={(event) => changeVolume(Number(event.target.value))} />
        </div>
        <audio
          ref={audioRef}
          src={selected.audio}
          preload="metadata"
          onLoadedMetadata={(event) => {
            const audio = event.currentTarget;
            audio.volume = volume;
            audio.playbackRate = playbackRate;
            setDuration(audio.duration);
            setCurrentTime(audio.currentTime);
          }}
          onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
          onDurationChange={(event) => setDuration(event.currentTarget.duration || 0)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => { setPlaying(false); setCurrentTime(0); }}
        />
      </div>

      {showQueue && (
        <div className="queue-panel">
          <div><strong>Listening queue</strong><button onClick={() => setShowQueue(false)}><X size={17} /></button></div>
          {books.filter((book) => book.audio).map((book) => (
            <button className={selected.id === book.id ? "queue-active" : ""} key={book.id} onClick={() => { setSelected(book); setPlaying(true); setShowQueue(false); }}>
              <Cover book={book} /><span><strong>{book.title}</strong><small>{book.author}</small></span><Play size={15} />
            </button>
          ))}
        </div>
      )}

      {showUpload && (
        <div className="modal-backdrop" onMouseDown={() => setShowUpload(false)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowUpload(false)}><X size={20} /></button>
            <span className="modal-icon"><Upload size={22} /></span>
            <h2>Add an audiobook</h2>
            <p>Share a story with the Audora community.</p>
            <form onSubmit={uploadBook}>
              <label>MP3 file<div className="file-drop"><Upload size={21} /><span>{uploadedFile ? uploadedFile.name : "Choose an MP3 file"}</span><input type="file" accept="audio/mpeg,.mp3" required onChange={(e: ChangeEvent<HTMLInputElement>) => setUploadedFile(e.target.files?.[0] ?? null)} /></div></label>
              <div className="form-row"><label>Book title<input name="title" required placeholder="The name of the book" /></label><label>Author<input name="author" required placeholder="Author name" /></label></div>
              <label>Description<textarea name="description" required placeholder="What is this story about?" rows={3} /></label>
              <button className="submit-upload" type="submit" disabled={!uploadedFile}><Upload size={17} /> Add to library</button>
            </form>
          </div>
        </div>
      )}
      {toast && <div className="toast"><CheckCircle2 size={18} /> {toast}</div>}
    </main>
  );
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`
    : `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}
