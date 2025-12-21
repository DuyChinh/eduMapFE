import { Row, Col, Avatar, List, Spin, Typography } from 'antd';
import { CrownFilled, UserOutlined } from '@ant-design/icons';
import './LeaderboardView.css';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

const LeaderboardView = ({ data, loading, pagination, onChange }) => {
  const { t } = useTranslation();

  // Sort data just in case, though API should handle it. 
  // We need to find Rank 1, 2, 3 for the podium from the current data page.
  // Note: If we are on page 2 (rank 21-40), podium should probably be empty or show nothing.
  
  const rank1 = data.find(item => item.rank === 1);
  const rank2 = data.find(item => item.rank === 2);
  const rank3 = data.find(item => item.rank === 3);

  const formatTime = (minutes) => {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    const secs = Math.round((minutes * 60) % 60); // Assuming precision
    
    // Logic from ExamDetailNew says: "381: const hours = Math.floor(minutes / 60);". 
    // And "383: return `${hours}h ${mins}m`;"
    // The image shows "21 giây" (21 seconds) or "40 phút" (40 minutes).
    // If minutes is float e.g. 0.35 -> 21 seconds.
    
    if (hours > 0) return `${hours}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs > 0 ? secs + 's' : ''}`;
    return `${secs}s`;
  };

  const renderPodiumItem = (item, position) => {
    if (!item) return <div className={`podium-item podium-rank-${position}`} style={{ opacity: 0 }} />; // Spacer

    return (
      <div className={`podium-item podium-rank-${position}`}>
        {position === 1 && <CrownFilled className="podium-crown" />}
        <div className="podium-avatar-wrapper">
          <Avatar 
            src={item.student?.avatar} 
            size={position === 1 ? 100 : position === 2 ? 70 : 60}
            icon={<UserOutlined />}
            style={{ border: '2px solid white' }}
          />
          <div className={`podium-rank-badge badge-${position}`}>
            {position}
          </div>
        </div>
        
        <div className="podium-info">
          <div className="podium-name" title={item.student?.name || item.student?.email}>
            {item.student?.name || item.student?.email}
          </div>
          <div className="podium-score">
            {item.score} {t('exams.leaderboard.score')}
          </div>
        </div>

        <div className={`podium-box-stand stand-${position}`}>
           {position === 1 && <img src="/1st-prize-troppy.png" className="trophy-icon-img" alt="1st" />}
           {position === 2 && <img src="/trophy-2.png" className="trophy-icon-img" alt="2nd" />}
           {position === 3 && <img src="/trophy-3.png" className="trophy-icon-img" alt="3rd" />}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
        <div style={{ textAlign: "center", padding: "50px" }}>
            <Spin size="large" />
        </div>
    );
  }

  return (
    <div className="leaderboard-container">
      <Row gutter={[24, 24]} style={{ width: '100%' }}>
        <Col xs={24} lg={14} className="podium-section">
            {/* Title for Podium section? Or just show the podium */}
            {/* Only show podium if we have at least rank 1 */}
            {(rank1 || rank2 || rank3) ? (
                <div className="podium-display">
                    {renderPodiumItem(rank2, 2)}
                    {renderPodiumItem(rank1, 1)}
                    {renderPodiumItem(rank3, 3)}
                </div>
            ) : (
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                    {t('exams.leaderboard.noData')}
                </div>
            )}
        </Col>

        <Col xs={24} lg={10} className="list-section">
            <List
                itemLayout="horizontal"
                dataSource={data}
                pagination={{
                    ...pagination,
                    onChange: onChange,
                    size: "small"
                }}
                renderItem={(item) => {
                    let rankClass = '';
                    if (item.rank === 1) rankClass = 'list-rank-1';
                    if (item.rank === 2) rankClass = 'list-rank-2';
                    if (item.rank === 3) rankClass = 'list-rank-3';

                    return (
                        <div className={`leaderboard-list-item ${rankClass}`}>
                            <div className="rank-number">
                                {item.rank === 1 ? <img src="/1st-medal.png" alt="1st" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> :
                                 item.rank === 2 ? <img src="/2nd-medal.png" alt="2nd" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> :
                                 item.rank === 3 ? <img src="/3rd-medal.png" alt="3rd" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> :
                                 item.rank}
                            </div>
                            <div className="student-info">
                                <Avatar 
                                    src={item.student?.avatar} 
                                    icon={<UserOutlined />} 
                                    className="student-list-avatar" 
                                />
                                <div className="student-details">
                                    <Text className="student-name" ellipsis>
                                        {item.student?.name || item.student?.email}
                                    </Text>
                                    <Text className="student-code">
                                        {item.student?.studentCode}
                                    </Text>
                                </div>
                            </div>
                            <div className="score-info">
                                <div className="score-val">
                                    {item.score} {t('exams.leaderboard.score')}
                                </div>
                                <div className="time-val">
                                    {formatTime(item.timeSpent)}
                                </div>
                            </div>
                            {item.rank === 1 && <img src="/1st-medal.png" style={{ width: 24, height: 24, marginLeft: 'auto' }} alt="1st" />}
                        </div>
                    );
                }}
            />
        </Col>
      </Row>
    </div>
  );
};

export default LeaderboardView;
