import { AccountView } from '@neondatabase/neon-js/auth/react/ui';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserCircle } from 'lucide-react';

export function Account() {
  const { pathname } = useParams();
  const navigate = useNavigate();

  return (
    <div className="account-page">
      <div className="account-navbar">
        <button onClick={() => navigate('/')} className="back-btn">
          <ArrowLeft size={20} />
          <span>Back to Dashboard</span>
        </button>
        <div className="account-title">
          <UserCircle size={24} className="title-icon" />
          <h2>Account Settings</h2>
        </div>
      </div>
      
      <div className="account-main">
        <div className="account-card">
          <AccountView pathname={pathname} />
        </div>
      </div>
    </div>
  );
}
