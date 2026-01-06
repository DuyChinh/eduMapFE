import React, { useState, useEffect } from 'react';
import { Modal, Upload, Button, Steps, Table, Typography, Space, Input, Select, message, Spin, Alert, Form, List, Tag, Card } from 'antd';
import { UploadOutlined, FilePdfOutlined, CheckCircleOutlined, EditOutlined, DeleteOutlined, SaveOutlined, EyeOutlined } from '@ant-design/icons';
import questionService from '../../api/questionService';
import { useTranslation } from 'react-i18next';
import QuestionEditorModal from './QuestionEditorModal';
import QuestionPreview from './QuestionPreview';

const { Step } = Steps;
const { Text, Title } = Typography;
const { Option } = Select;

const UploadQuestionsPdfModal = ({ visible, onClose, onSuccess, subjects }) => {
    const { t } = useTranslation();
    const [currentStep, setCurrentStep] = useState(0);
    const [fileList, setFileList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [questions, setQuestions] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [processingStatus, setProcessingStatus] = useState('');
    const [collectionName, setCollectionName] = useState(''); // Name for the question set

    // Editor Modal State
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [currentEditQuestion, setCurrentEditQuestion] = useState(null);
    const [currentEditIndex, setCurrentEditIndex] = useState(-1);

    // Reset state when modal opens
    useEffect(() => {
        if (visible) {
            setCurrentStep(0);
            setFileList([]);
            setQuestions([]);
            setProcessingStatus('');
            setCollectionName('');
            setSelectedSubject(null);
        }
    }, [visible]);

    const handleUpload = async () => {
        if (fileList.length === 0) {
            message.error(t('questions.pdf.errorSelectFile'));
            return;
        }

        if (!selectedSubject) {
            message.error(t('questions.pdf.errorSelectSubject'));
            return;
        }

        setLoading(true);
        setProcessingStatus(t('questions.pdf.uploadingStatus'));

        try {
            const file = fileList[0].originFileObj;
            // Set default collection name from filename if empty
            if (!collectionName) {
                setCollectionName(file.name.replace('.pdf', ''));
            }

            const response = await questionService.uploadPdf(file);

            if (response && response.ok && response.data) {
                // Flatten questions from pages if necessary
                let allQuestions = [];
                if (response.data.pages) {
                    response.data.pages.forEach(page => {
                        if (page.questions) {
                            allQuestions = allQuestions.concat(page.questions);
                        }
                    });
                } else if (response.data.questions) {
                    allQuestions = response.data.questions;
                }

                // Ensure every question has necessary fields and subject is set
                const processedQuestions = allQuestions.map((q, index) => {
                    // Normalize type
                    let type = 'mcq';
                    if (q.type) {
                        const t = q.type.toLowerCase();
                        if (t.includes('essay') || t.includes('tự luận')) type = 'essay';
                        else if (t.includes('short') || t.includes('ngắn')) type = 'short';
                        else if (t.includes('true') || t.includes('đúng')) type = 'tf';
                        else type = 'mcq';
                    }

                    // Normalize choices
                    const rawChoices = q.answers || q.choices || [];

                    return {
                        ...q,
                        subjectId: selectedSubject,
                        name: `Q${q.questionNumber || index + 1}`,
                        text: q.questionText || '',
                        type: type,
                        choices: rawChoices.map(a => typeof a === 'object' ? a : { text: a, image: '' }),
                        answer: q.correctAnswer === 'A' ? 0 : q.correctAnswer === 'B' ? 1 : q.correctAnswer === 'C' ? 2 : q.correctAnswer === 'D' ? 3 : 0,
                        level: 1, // Default level
                        isPublic: false
                    };
                });

                setQuestions(processedQuestions);
                setCurrentStep(1);
                message.success(t('questions.pdf.parseSuccess'));
            } else {
                message.error(t('questions.pdf.parseFail'));
            }
        } catch (error) {
            message.error(t('questions.pdf.errorUploadMsg') + (error.message || 'Unknown error'));
        } finally {
            setLoading(false);
            setProcessingStatus('');
        }
    };

    const handleSaveQuestions = async () => {
        if (questions.length === 0) {
            message.warning(t('questions.pdf.noQuestionsToSave'));
            return;
        }

        setLoading(true);
        setProcessingStatus(t('questions.pdf.savingStatus'));

        try {
            // Prepare questions with the final collection name prefix if desired, or just ensure subject
            const questionsToSave = questions.map((q, idx) => {
                // Backend requires choices to have 'key' if they are objects, and answer to match the key
                const mappedChoices = q.choices.map((c, i) => ({
                    ...c,
                    key: String.fromCharCode(65 + i) // A, B, C...
                }));

                // Convert valid answer index to key string (0 -> 'A')
                // If answer is already a string key (rare case in this flow), keep it? 
                // But our flow uses index 0-3.
                const answerIndex = Number(q.answer);
                const answerKey = !isNaN(answerIndex) && answerIndex >= 0 && answerIndex < 26
                    ? String.fromCharCode(65 + answerIndex)
                    : q.answer; // Fallback

                return {
                    ...q,
                    name: `${collectionName} - ${q.name || (idx + 1)}`, // Prefix with collection name
                    subjectId: selectedSubject,
                    choices: mappedChoices,
                    answer: answerKey
                };
            });

            const response = await questionService.batchCreateQuestions(questionsToSave);

            if (response && response.ok) {
                const { success, failed } = response.results || {};
                message.success(t('questions.pdf.saveSuccess', { success, failed }));
                if (onSuccess) onSuccess();
                onClose();
            } else {
                message.error(t('questions.pdf.saveFail'));
            }
        } catch (error) {
            message.error(t('questions.pdf.errorSaveMsg'));
        } finally {
            setLoading(false);
            setProcessingStatus('');
        }
    };

    const removeQuestion = (index) => {
        const newQuestions = [...questions];
        newQuestions.splice(index, 1);
        setQuestions(newQuestions);
    };

    const openEditModal = (record, index) => {
        setCurrentEditQuestion({ ...record });
        setCurrentEditIndex(index);
        setEditModalVisible(true);
    };

    const handleEditSave = (updatedQuestionData) => {
        const newQuestions = [...questions];
        newQuestions[currentEditIndex] = {
            ...newQuestions[currentEditIndex],
            ...updatedQuestionData
        };
        setQuestions(newQuestions);
        setEditModalVisible(false);
        setCurrentEditQuestion(null);
        message.success(t('questions.pdf.questionUpdated'));
    };

    const renderUploadStep = () => (
        <div style={{ padding: '20px 0' }}>
            <Alert
                message={t("questions.pdf.uploadNote")}
                description={t("questions.pdf.uploadNoteDesc")}
                type="info"
                showIcon
                style={{ marginBottom: 20 }}
            />

            <Form layout="vertical">
                <Form.Item label={t('questions.pdf.collectionName')} required>
                    <Input
                        placeholder={t('questions.pdf.collectionNamePlaceholder')}
                        value={collectionName}
                        onChange={(e) => setCollectionName(e.target.value)}
                    />
                </Form.Item>

                <Form.Item label={t('questions.pdf.subject')} required>
                    <Select
                        style={{ width: '100%' }}
                        placeholder={t('questions.pdf.chooseSubject')}
                        onChange={setSelectedSubject}
                        value={selectedSubject}
                        optionFilterProp="children"
                        showSearch
                    >
                        {subjects.map(s => (
                            <Option key={s._id || s.id} value={s._id || s.id}>{s.name} ({s.code})</Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item label={t('questions.pdf.uploadLabel')}>
                    <Upload.Dragger
                        fileList={fileList}
                        beforeUpload={() => false}
                        onChange={({ fileList }) => {
                            setFileList(fileList.slice(-1));
                            // Auto fill name if empty
                            if (fileList.length > 0 && !collectionName) {
                                setCollectionName(fileList[0].name.replace('.pdf', ''));
                            }
                        }}
                        accept=".pdf"
                        multiple={false}
                    >
                        <p className="ant-upload-drag-icon">
                            <FilePdfOutlined />
                        </p>
                        <p className="ant-upload-text">{t('questions.pdf.dragDropText')}</p>
                    </Upload.Dragger>
                </Form.Item>
            </Form>

            <div style={{ textAlign: 'right', marginTop: 20 }}>
                <Button
                    type="primary"
                    onClick={handleUpload}
                    loading={loading}
                    icon={<UploadOutlined />}
                >
                    {t('questions.pdf.uploadButton')}
                </Button>
            </div>
        </div>
    );

    const renderReviewStep = () => (
        <div style={{ padding: '20px 0' }}>
            {/* Header Form */}
            <div style={{ background: '#fff', padding: 16, marginBottom: 16, border: '1px solid #f0f0f0', borderRadius: 8 }}>
                <Form layout="vertical" size="small">
                    <Space size="large" style={{ display: 'flex', width: '100%' }}>
                        <Form.Item label={t('questions.pdf.collectionName')} style={{ flex: 1, margin: 0 }}>
                            <Input
                                value={collectionName}
                                onChange={(e) => setCollectionName(e.target.value)}
                            />
                        </Form.Item>
                        <Form.Item label={t('questions.pdf.subject')} style={{ flex: 1, margin: 0 }}>
                            <Select
                                value={selectedSubject}
                                onChange={setSelectedSubject}
                                disabled // Subject is usually locked after upload to avoid confusion, or can enable
                            >
                                {subjects.map(s => <Option key={s._id || s.id} value={s._id || s.id}>{s.name}</Option>)}
                            </Select>
                        </Form.Item>
                    </Space>
                </Form>
            </div>

            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text strong>{t('questions.pdf.totalQuestions')}: {questions.length}</Text>
                <Space>
                    <Button onClick={() => setCurrentStep(0)}>{t('questions.pdf.back')}</Button>
                    <Button type="primary" onClick={handleSaveQuestions} loading={loading} icon={<SaveOutlined />}>
                        {t('questions.pdf.saveAll')}
                    </Button>
                </Space>
            </div>

            <List
                grid={{ gutter: 16, column: 1 }}
                dataSource={questions}
                className="question-review-list"
                renderItem={(item, index) => (
                    <List.Item key={index}>
                        <Card
                            size="small"
                            title={
                                <Space>
                                    <Text strong>{t('questions.pdf.question')} {index + 1}:</Text>
                                    <Tag color="blue">{item.type ? item.type.toUpperCase() : 'MCQ'}</Tag>
                                </Space>
                            }
                            extra={
                                <Space>
                                    <Button
                                        size="small"
                                        icon={<EditOutlined />}
                                        onClick={() => openEditModal(item, index)}
                                    >
                                        {t('questions.pdf.edit')}
                                    </Button>
                                    <Button
                                        size="small"
                                        danger
                                        icon={<DeleteOutlined />}
                                        onClick={() => removeQuestion(index)}
                                    />
                                </Space>
                            }
                            style={{ marginBottom: 16 }}
                        >
                            <QuestionPreview questionData={item} subjects={subjects} />
                        </Card>
                    </List.Item>
                )}
            />

            {/* Detailed Editor Modal */}
            <QuestionEditorModal
                visible={editModalVisible}
                questionData={currentEditQuestion}
                onSave={handleEditSave}
                onCancel={() => setEditModalVisible(false)}
                subjects={subjects}
            />
        </div>
    );

    return (
        <Modal
            open={visible}
            onCancel={!loading ? onClose : null}
            footer={null}
            width={1000}
            title={t('questions.pdf.title')}
            maskClosable={false}
            destroyOnHidden
            style={{ top: 20 }}
        >
            <Steps current={currentStep} style={{ marginBottom: 24 }}>
                <Step title={t('questions.pdf.stepUpload')} icon={<FilePdfOutlined />} />
                <Step title={t('questions.pdf.stepReview')} icon={<EditOutlined />} />
                <Step title={t('questions.pdf.stepSave')} icon={<CheckCircleOutlined />} />
            </Steps>

            {loading && processingStatus && (
                <div style={{ textAlign: 'center', margin: '40px 0' }}>
                    <Spin size="large" />
                    <div style={{ marginTop: 16 }}>{processingStatus}</div>
                </div>
            )}

            {!loading && currentStep === 0 && renderUploadStep()}
            {!loading && currentStep === 1 && renderReviewStep()}
        </Modal>
    );
};

export default UploadQuestionsPdfModal;
