import { Link } from 'react-router-dom';
import CampaignSearch from '../components/CampaignSearch.jsx';
import './campaigns.css';

export default function SearchCampaigns() {
  return (
    <div className="search-campaigns">
      <Link to="/main">Volver al panel principal</Link>
      <h1>Buscar campañas</h1>
      <CampaignSearch />
    </div>
  );
}
