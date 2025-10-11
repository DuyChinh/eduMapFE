import { Card, Row, Col, Statistic, Empty, Typography, Button } from 'antd';
import {
  BookOutlined,
  TrophyOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '../../constants/config';
import './StudentPages.css';

const { Title, Paragraph } = Typography;

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="student-dashboard">
      <div className="page-header">
        <div>
          <Title level={2}>{t('studentDashboard.welcome')}</Title>
          <Paragraph>
            {t('studentDashboard.description')}
          </Paragraph>
        </div>
        <Button 
          type="primary" 
          size="large"
          icon={<PlusOutlined />}
          onClick={() => navigate(ROUTES.STUDENT_CLASSES)}
        >
          {t('studentDashboard.joinClass')}
        </Button>
      </div>

      {/* Statistics */}
      <Row gutter={[16, 16]} className="statistics-row">
        <Col xs={24} sm={12} lg={6}>
          <Card variant="borderless" className="stat-card stat-card-blue">
            <Statistic
              title={t('studentDashboard.statistics.classes')}
              value={0}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card variant="borderless" className="stat-card stat-card-green">
            <Statistic
              title={t('studentDashboard.statistics.exams')}
              value={0}
              prefix={<BookOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card variant="borderless" className="stat-card stat-card-purple">
            <Statistic
              title={t('studentDashboard.statistics.completed')}
              value={0}
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card variant="borderless" className="stat-card stat-card-orange">
            <Statistic
              title={t('studentDashboard.statistics.upcoming')}
              value={0}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Upcoming Exams */}
      <Card 
        title={t('studentDashboard.upcomingExams')}
        variant="borderless"
        className="upcoming-exams-card"
        extra={<a href="#">{t('common.viewAll')}</a>}
      >
        <Empty 
          description={t('studentDashboard.noExams')}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>

      {/* Recent Results */}
      <Card 
        title={t('studentDashboard.recentResults')}
        variant="borderless"
        className="recent-results-card"
        extra={
          <Button 
            type="link"
            onClick={() => navigate(ROUTES.STUDENT_RESULTS)}
          >
            {t('common.viewAll')}
          </Button>
        }
      >
        <Empty 
          description={t('studentDashboard.noResults')}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    </div>
  );
};

export default StudentDashboard;
