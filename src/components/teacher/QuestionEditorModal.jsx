import { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Button, Row, Col, Typography, Space, message, Upload, Card } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined, EyeOutlined, LoadingOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import MathJaxEditor from './MathJaxEditor';
import QuestionPreview from './QuestionPreview';
import uploadService from '../../api/uploadService';

const { Title, Text } = Typography;
const { Option } = Select;

const QuestionEditorModal = ({ visible, questionData, onCancel, onSave, subjects }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    // Separate local state for live preview
    const [currentData, setCurrentData] = useState({
        name: '',
        text: '',
        type: 'mcq',
        level: '1',
        subject: '',
        choices: ['', '', '', ''],
        answer: '',
        explanation: '',
        isPublic: true,
        images: [] // Ensure images array exists
    });

    const { t } = useTranslation();

    useEffect(() => {
        if (visible && questionData) {
            // Deep copy and normalize data
            let processedChoices = ['', '', '', ''];

            if (questionData.choices && Array.isArray(questionData.choices)) {
                if (typeof questionData.choices[0] === 'string') {
                    processedChoices = [...questionData.choices];
                } else if (typeof questionData.choices[0] === 'object') {
                    processedChoices = questionData.choices.map(c => ({
                        text: c.text || '',
                        image: c.image || ''
                    }));
                }
            }

            // Ensure 4 choices for MCQ
            while (processedChoices.length < 4) {
                processedChoices.push(typeof processedChoices[0] === 'object' ? { text: '', image: '' } : '');
            }

            // Normalize answer to key (A, B, C, D) or index (0, 1, 2, 3) depending on how we want to edit
            // For editing UI, index is easier for Select. 
            // Input data might have answer as 'A' or 0.
            let answerVal = 0;
            const answerKeys = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
            if (typeof questionData.answer === 'number') {
                answerVal = questionData.answer;
            } else if (typeof questionData.answer === 'string') {
                const idx = answerKeys.indexOf(questionData.answer);
                if (idx !== -1) answerVal = idx;
            }

            const initData = {
                name: questionData.name || '',
                text: questionData.text || '',
                type: questionData.type || 'mcq',
                level: questionData.level?.toString() || '1',
                subject: questionData.subjectId || questionData.subject || '',
                choices: processedChoices,
                answer: answerVal,
                explanation: questionData.explanation || '',
                isPublic: questionData.isPublic !== undefined ? questionData.isPublic : true,
                images: questionData.images || (questionData.image ? [questionData.image] : [])
            };

            setCurrentData(initData);
            form.setFieldsValue(initData);
        }
    }, [visible, questionData, form]);

    const handleFormChange = (changedValues, allValues) => {
        setCurrentData(prev => ({
            ...prev,
            ...allValues
        }));
    };

    const handleChoiceChange = (index, value, field = 'text') => {
        const newChoices = [...currentData.choices];
        if (typeof newChoices[index] === 'object') {
            newChoices[index] = { ...newChoices[index], [field]: value };
        } else {
            // If it was string, convert to object if setting text, or just string
            if (field === 'text') newChoices[index] = value;
        }

        setCurrentData(prev => ({ ...prev, choices: newChoices }));
        // Update form value for specific choice index not straightforward without nested form list
        // But we are managing state manually for preview, so form sync is for final submit
        // We need to sync 'choices' field in form
        form.setFieldsValue({ choices: newChoices });
    };

    // Helper for choice text update (handles both string and object structure)
    const updateChoiceText = (index, text) => {
        const newChoices = [...currentData.choices];
        if (typeof newChoices[index] === 'object') {
            newChoices[index] = { ...newChoices[index], text };
        } else {
            newChoices[index] = text;
        }
        setCurrentData(prev => ({ ...prev, choices: newChoices }));
        form.setFieldsValue({ choices: newChoices });
    };

    const addChoice = () => {
        const newChoice = typeof currentData.choices[0] === 'object' ? { text: '', image: '' } : '';
        const newChoices = [...currentData.choices, newChoice];
        setCurrentData(prev => ({ ...prev, choices: newChoices }));
        form.setFieldsValue({ choices: newChoices });
    };

    const removeChoice = (index) => {
        if (currentData.choices.length > 2) {
            const newChoices = currentData.choices.filter((_, i) => i !== index);
            setCurrentData(prev => ({ ...prev, choices: newChoices }));
            form.setFieldsValue({ choices: newChoices });
        }
    };

    const handleQuestionImagesUpload = async ({ file, onSuccess, onError }) => {
        try {
            setUploading(true);
            const response = await uploadService.uploadImage(file);
            if (response && response.data && response.data.url) {
                const imageUrl = response.data.url;
                const newImages = [...(currentData.images || []), imageUrl];
                setCurrentData(prev => ({ ...prev, images: newImages }));
                onSuccess(null, file);
                message.success('Image uploaded successfully');
            } else {
                onError(new Error('Upload failed'));
            }
        } catch (error) {
            onError(error);
            message.error('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const removeQuestionImage = (indexToRemove) => {
        const newImages = currentData.images.filter((_, index) => index !== indexToRemove);
        setCurrentData(prev => ({ ...prev, images: newImages }));
    };

    const handleChoiceImageUpload = async (index, { file, onSuccess, onError }) => {
        try {
            const response = await uploadService.uploadImage(file);
            if (response && response.data && response.data.url) {
                const imageUrl = response.data.url;
                const newChoices = [...currentData.choices];
                // Ensure object structure
                if (typeof newChoices[index] !== 'object') {
                    newChoices[index] = { text: newChoices[index], image: imageUrl };
                } else {
                    newChoices[index] = { ...newChoices[index], image: imageUrl };
                }

                setCurrentData(prev => ({ ...prev, choices: newChoices }));
                form.setFieldsValue({ choices: newChoices });
                onSuccess(null, file);
            } else {
                onError(new Error('Upload failed'));
            }
        } catch (error) {
            onError(error);
        }
    };

    const removeChoiceImage = (index) => {
        const newChoices = [...currentData.choices];
        if (typeof newChoices[index] === 'object') {
            newChoices[index] = { ...newChoices[index], image: '' };
            setCurrentData(prev => ({ ...prev, choices: newChoices }));
            form.setFieldsValue({ choices: newChoices });
        }
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();

            // Merge form values with state (for images that aren't in form fields directly)
            const finalData = {
                ...values,
                choices: currentData.choices, // Use state choices which handles both structure/string
                images: currentData.images,
                // Map answer index back to key if needed, but PDF Modal expects index or key?
                // The current PDF flow uses index 0-3 for answer.
                // Let's return the index as is (values.answer is index from Select).
                correctAnswer: ['A', 'B', 'C', 'D'][values.answer] || 'A' // Map back to letter for backend alignment
            };

            onSave(finalData);
        } catch (error) {
            console.error('Validation Failed:', error);
        }
    };

    const beforeUpload = (file) => {
        const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
        if (!isJpgOrPng) {
            message.error('You can only upload JPG/PNG file!');
        }
        return isJpgOrPng;
    };

    return (
        <Modal
            title={t('exams.editQuestion') || "Edit Question"}
            open={visible}
            onCancel={onCancel}
            footer={null}
            width={1200}
            style={{ top: 20 }}
            maskClosable={false}
            destroyOnClose
        >
            <Row gutter={24}>
                {/* Left Column - Form */}
                <Col xs={24} lg={14}>
                    <Form
                        form={form}
                        layout="vertical"
                        onValuesChange={handleFormChange}
                        initialValues={currentData}
                    >
                        {/* Question Name */}
                        <Form.Item
                            label={t('questions.name')}
                            name="name"
                            rules={[{ required: true, message: t('questions.nameRequired') }]}
                        >
                            <Input placeholder={t('questions.namePlaceholder')} />
                        </Form.Item>

                        {/* Question Text */}
                        <Form.Item
                            label={t('questions.text')}
                            name="text"
                            rules={[{ required: true, message: t('questions.textRequired') }]}
                        >
                            <MathJaxEditor
                                value={currentData.text}
                                onChange={(value) => {
                                    setCurrentData(prev => ({ ...prev, text: value }));
                                    form.setFieldsValue({ text: value });
                                }}
                                placeholder={t('questions.textPlaceholder')}
                                rows={4}
                                showPreview={false} // Preview is on the right
                                showToolbar={true}
                            />
                        </Form.Item>

                        {/* Images */}
                        <Form.Item label={t('questions.images') || "Images"}>
                            <div style={{ marginBottom: 16 }}>
                                <Upload
                                    listType="picture-card"
                                    showUploadList={false}
                                    customRequest={handleQuestionImagesUpload}
                                    beforeUpload={beforeUpload}
                                >
                                    <div>
                                        {uploading ? <LoadingOutlined /> : <PlusOutlined />}
                                        <div style={{ marginTop: 8 }}>Upload</div>
                                    </div>
                                </Upload>
                            </div>
                            {currentData.images && currentData.images.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {currentData.images.map((imgUrl, index) => (
                                        <div key={index} style={{ position: 'relative', width: '80px', height: '80px', border: '1px solid #d9d9d9', padding: '4px' }}>
                                            <img src={imgUrl} alt="q-img" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                            <DeleteOutlined
                                                style={{ position: 'absolute', top: 0, right: 0, color: 'red', background: '#fff', cursor: 'pointer' }}
                                                onClick={() => removeQuestionImage(index)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Form.Item>

                        {/* Type & Level & Subject */}
                        <Row gutter={16}>
                            <Col span={8}>
                                <Form.Item label={t('questions.type')} name="type">
                                    <Select>
                                        <Option value="mcq">{t('questions.typeMCQ')}</Option>
                                        <Option value="tf">{t('questions.typeTF')}</Option>
                                        <Option value="short">{t('questions.typeShort')}</Option>
                                        <Option value="essay">{t('questions.typeEssay')}</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item label={t('questions.level')} name="level">
                                    <Select>
                                        <Option value="1">1</Option>
                                        <Option value="2">2</Option>
                                        <Option value="3">3</Option>
                                        <Option value="4">4</Option>
                                        <Option value="5">5</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item label={t('questions.subject')} name="subject">
                                    <Select showSearch optionFilterProp="children">
                                        {subjects.map(s => <Option key={s._id || s.id} value={s._id || s.id}>{s.name}</Option>)}
                                    </Select>
                                </Form.Item>
                            </Col>
                        </Row>

                        {/* Choices (MCQ) */}
                        {currentData.type === 'mcq' && (
                            <Form.Item label={t('questions.choices')}>
                                {currentData.choices.map((choice, index) => (
                                    <div key={index} style={{ marginBottom: 12, border: '1px solid #eee', padding: 8, borderRadius: 4 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <Text strong>{t('questions.choice')} {String.fromCharCode(65 + index)}</Text>
                                            {currentData.choices.length > 2 && <Button size="small" danger type="text" icon={<DeleteOutlined />} onClick={() => removeChoice(index)} />}
                                        </div>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <div style={{ flex: 1 }}>
                                                <MathJaxEditor
                                                    value={typeof choice === 'object' ? choice.text : choice}
                                                    onChange={(val) => updateChoiceText(index, val)}
                                                    rows={2}
                                                />
                                            </div>
                                            <div style={{ width: 50 }}>
                                                <Upload
                                                    listType="picture-card"
                                                    showUploadList={false}
                                                    customRequest={(ops) => handleChoiceImageUpload(index, ops)}
                                                    beforeUpload={beforeUpload}
                                                    style={{ width: 50, height: 50 }}
                                                >
                                                    {(typeof choice === 'object' && choice.image) ? (
                                                        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                                                            <img src={choice.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            <DeleteOutlined
                                                                style={{ position: 'absolute', top: -5, right: -5, color: 'red', background: '#fff' }}
                                                                onClick={(e) => { e.stopPropagation(); removeChoiceImage(index); }}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <PlusOutlined />
                                                    )}
                                                </Upload>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <Button type="dashed" block icon={<PlusOutlined />} onClick={addChoice}>{t('questions.addChoice')}</Button>
                            </Form.Item>
                        )}

                        <Form.Item label={t('questions.answer')} name="answer" rules={[{ required: true }]}>
                            {currentData.type === 'mcq' ? (
                                <Select>
                                    {currentData.choices.map((_, idx) => (
                                        <Option key={idx} value={idx}>{t('questions.choice')} {String.fromCharCode(65 + idx)}</Option>
                                    ))}
                                </Select>
                            ) : (
                                <MathJaxEditor
                                    value={currentData.answer}
                                    onChange={(v) => {
                                        setCurrentData(p => ({ ...p, answer: v }));
                                        form.setFieldsValue({ answer: v });
                                    }}
                                />
                            )}
                        </Form.Item>

                        <Form.Item label={t('questions.explanation')} name="explanation">
                            <MathJaxEditor
                                value={currentData.explanation}
                                onChange={(v) => {
                                    setCurrentData(p => ({ ...p, explanation: v }));
                                    form.setFieldsValue({ explanation: v });
                                }}
                            />
                        </Form.Item>

                        <div style={{ textAlign: 'right', marginTop: 20 }}>
                            <Space>
                                <Button onClick={onCancel}>{t('common.cancel')}</Button>
                                <Button type="primary" onClick={handleSubmit} icon={<SaveOutlined />}>{t('common.save')}</Button>
                            </Space>
                        </div>
                    </Form>
                </Col>

                {/* Right Column - Preview */}
                <Col xs={24} lg={10}>
                    <Card
                        title={<Space><EyeOutlined /> {t('questions.preview') || "Preview (Real-time)"}</Space>}
                        style={{ position: 'sticky', top: 0, maxHeight: '80vh', overflowY: 'auto' }}
                    >
                        <QuestionPreview questionData={currentData} subjects={subjects} />
                    </Card>
                </Col>
            </Row>
        </Modal>
    );
};

export default QuestionEditorModal;
