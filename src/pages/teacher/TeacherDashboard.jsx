import { Card, Row, Col, Statistic, Space, Typography } from 'antd';
import {
  FileTextOutlined,
  BookOutlined,
  TeamOutlined,
  PlusOutlined,
  CloudDownloadOutlined,
  CloudUploadOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '../../constants/config';
import './TeacherPages.css';

const { Title, Paragraph } = Typography;

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="teacher-dashboard">
      <div className="page-header">
        <div>
          <Title level={2}>{t('teacherDashboard.welcomeBack')}</Title>
          <Paragraph>
            {t('teacherDashboard.description')}
          </Paragraph>
        </div>
      </div>

      {/* Statistics */}
      <Row gutter={[16, 16]} className="statistics-row">
        <Col xs={24} sm={12} lg={6}>
          <Card variant="borderless" className="stat-card stat-card-blue">
            <Statistic
              title={t('teacherDashboard.statistics.questions')}
              value={0}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card variant="borderless" className="stat-card stat-card-green">
            <Statistic
              title={t('teacherDashboard.statistics.exams')}
              value={0}
              prefix={<BookOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card variant="borderless" className="stat-card stat-card-purple">
            <Statistic
              title={t('teacherDashboard.statistics.classes')}
              value={0}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card variant="borderless" className="stat-card stat-card-orange">
            <Statistic
              title={t('teacherDashboard.statistics.students')}
              value={0}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Quick Actions */}
      <Card 
        title={t('teacherDashboard.quickStart')}
        variant="borderless"
        className="quick-actions-card"
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={8}>
            <Card 
              hoverable
              className="action-card"
              onClick={() => navigate(ROUTES.TEACHER_QUESTIONS)}
            >
              <Space direction="vertical" align="center" style={{ width: '100%' }}>
                <div className="action-icon action-icon-blue">
                  <PlusOutlined style={{ fontSize: 32 }} />
                </div>
                <Title level={4}>{t('teacherDashboard.actions.createExam')}</Title>
                <Paragraph type="secondary" style={{ textAlign: 'center' }}>
                  {t('teacherDashboard.actions.createExamDesc')}
                </Paragraph>
              </Space>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={8}>
            <Card 
              hoverable
              className="action-card"
            >
              <Space direction="vertical" align="center" style={{ width: '100%' }}>
                <div className="action-icon action-icon-green">
                  <CloudUploadOutlined style={{ fontSize: 32 }} />
                </div>
                <Title level={4}>{t('teacherDashboard.actions.fromBank')}</Title>
                <Paragraph type="secondary" style={{ textAlign: 'center' }}>
                  {t('teacherDashboard.actions.fromBankDesc')}
                </Paragraph>
              </Space>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={8}>
            <Card 
              hoverable
              className="action-card"
            >
              <Space direction="vertical" align="center" style={{ width: '100%' }}>
                <div className="action-icon action-icon-purple">
                  <CloudDownloadOutlined style={{ fontSize: 32 }} />
                </div>
                <Title level={4}>{t('teacherDashboard.actions.downloadExam')}</Title>
                <Paragraph type="secondary" style={{ textAlign: 'center' }}>
                  {t('teacherDashboard.actions.downloadExamDesc')}
                </Paragraph>
              </Space>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Recent Activities */}
      <Card 
        title={t('teacherDashboard.recentActivities')}
        variant="borderless"
        className="recent-activities-card"
      >
        <div className="empty-state">
          <FileTextOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
          <Paragraph type="secondary">{t('teacherDashboard.noActivities')}</Paragraph>
        </div>
      </Card>
    </div>
  );
};

export default TeacherDashboard;
