import { useState, useEffect } from 'react';
import { api } from '../api';

const cardStyle: React.CSSProperties = {
  background: '#1a1a1a',
  borderRadius: '12px',
  padding: '20px',
  border: '1px solid #333',
  marginBottom: '12px',
};

export default function PostHistory() {
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    api.getPosts().then(setPosts).catch(() => {});
  }, []);

  return (
    <div>
      <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>Post History</h1>

      {posts.length === 0 && <p style={{ color: '#666' }}>No published posts yet.</p>}

      {posts.map((post) => (
        <div key={post.id} style={cardStyle}>
          <p style={{ fontSize: '15px', lineHeight: 1.5, marginBottom: '12px' }}>{post.content}</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666' }}>
            <span>ID: {post.threadsMediaId}</span>
            <span>{new Date((post.createdAt as number) * 1000).toLocaleString()}</span>
          </div>
          {post.permalink && (
            <a href={post.permalink} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', fontSize: '13px' }}>
              View on Threads
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
