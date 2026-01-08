import { useState } from 'react';
import {
  Modal,
  Upload,
  Button,
  Steps,
  App,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Progress,
  Alert,
  Card,
  Radio,
  Divider,
  Tag,
  DatePicker,
  Row,
  Col
} from 'antd';
import {
  InboxOutlined,
  FileOutlined,
  CheckCircleOutlined,
  EditOutlined,
  LoadingOutlined,
  PlusOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import { MathJax, MathJaxContext } from 'better-react-mathjax';
import pdfExamService from '../../api/pdfExamService';
import uploadService from '../../api/uploadService';
import MathJaxEditor from './MathJaxEditor';
import QuestionPreview from './QuestionPreview';

const { Dragger } = Upload;
const { Step } = Steps;
const { Option } = Select;

const UploadPdfModal = ({ open, onClose, onSuccess, subjects }) => {
  const { t, i18n } = useTranslation();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  const [currentStep, setCurrentStep] = useState(0);
  const [parsing, setParsing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [allQuestions, setAllQuestions] = useState([]);
  const [selectedAnswers, setSelectedAnswers] = useState({});

  const [previewImage, setPreviewImage] = useState(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewVisible, setPreviewVisible] = useState(false);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [editingImages, setEditingImages] = useState([]);
  const [editingChoiceImages, setEditingChoiceImages] = useState({});
  const [uploading, setUploading] = useState(false);

  const mathJaxConfig = {
    loader: { load: ['[tex]/html', '[tex]/mhchem'] },
    tex: {
      inlineMath: [['$', '$'], ['\\(', '\\)']],
      displayMath: [['$$', '$$'], ['\\[', '\\]']],
      packages: { '[+]': ['html', 'mhchem'] },
      processEscapes: true,
      processEnvironments: true,
    },
    options: {
      skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre'],
    },
  };

  const cleanTextSegment = (text) => {
    return text
      .replace(/\bđ\s+lớn/g, 'độ lớn')
      .replace(/\bđ\s+lệch/g, 'độ lệch')
      .replace(/\bđ\s+cao/g, 'độ cao')
      .replace(/\bđ\s+sâu/g, 'độ sâu')
      .replace(/\bđ\s+cứng/g, 'độ cứng')
      .replace(/biên\s+đ\b/g, 'biên độ')
      .replace(/mật\s+đ\b/g, 'mật độ')
      .replace(/tốc\s+đ\b/g, 'tốc độ')

      .replace(/đi[\ufffd\?]{1,4}n/g, 'điện')
      .replace(/ch[\ufffd\?]{1,5}t/g, 'chất')
      .replace(/đi[^a-zA-Z\s0-9]{1,4}n/g, 'điện')
      .replace(/\bv[\ufffd\?]{1,4}\b/g, 'và')

      .replace(/\bđin\b/g, 'điện')
      .replace(/ngun/g, 'nguồn')
      .replace(/cưng/g, 'cường')
      .replace(/trưng/g, 'trường')
      .replace(/bưc/g, 'bước')
      .replace(/thưng/g, 'thường')
      .replace(/[\ufffd\?]{2,}/g, '')

      .replace(/(?<!\\)\b((?:[A-Z][a-z]?\d*|\((?:[A-Z][a-z]?\d*)+\)\d*){2,})\b/g, (match) => {
        const formatted = match.replace(/(\d+)/g, '_$1');
        return `$\\mathrm{${formatted}}$`;
      })
      .replace(/(?<!\\)\b([A-Z][a-z]?\d+)\b/g, (match) => {
        const formatted = match.replace(/(\d+)/g, '_$1');
        return `$\\mathrm{${formatted}}$`;
      });
  };

  const cleanMathSegment = (text) => {
    return text.replace(/\\(pi|alpha|beta|gamma|delta|omega|sigma|theta|lambda|mu)([a-zA-Z0-9])/g, '\\$1 $2');
  };

  const renderMathContent = (content) => {
    if (!content) return '';

    const contentStr = typeof content === 'string' ? content : String(content);

    const tokens = contentStr.split(/(\$[^$]+\$|\\\(.+?\\\))/g);

    const processedStr = tokens.map(token => {
      const isDollar = token.startsWith('$') && token.endsWith('$');
      const isParen = token.startsWith('\\(') && token.endsWith('\\)');

      if (isDollar || isParen) {
        return cleanMathSegment(token);
      } else {
        return cleanTextSegment(token);
      }
    }).join('');

    const lines = processedStr.split('\n');

    return (
      <>
        {lines.map((line, index) => {
          if (!line.trim()) return <br key={index} />;

          const chunks = line.split(/(\$[^$]+\$|\\\(.+?\\\))/g);

          return (
            <div key={index} style={{
              fontFamily: 'inherit',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
              marginBottom: 4
            }}>
              {chunks.map((chunk, i) => {
                const isDollar = chunk.startsWith('$') && chunk.endsWith('$');
                const isParen = chunk.startsWith('\\(') && chunk.endsWith('\\)');

                if (isDollar || isParen) {
                  let rawMath = chunk;
                  if (isDollar) rawMath = chunk.slice(1, -1);
                  if (isParen) rawMath = chunk.slice(2, -2);

                  return (
                    <MathJax key={i} inline>
                      {`$${rawMath}$`}
                    </MathJax>
                  );
                }

                const subParts = chunk.split(/(\\[a-zA-Z]+(?:\{(?:[^{}]|\{[^{}]*\})*\})*)/g);

                return (
                  <span key={i}>
                    {subParts.map((sub, j) => {
                      if (sub.match(/^\\[a-zA-Z]+/)) {
                        return (
                          <MathJax key={j} inline>
                            {`$${sub}$`}
                          </MathJax>
                        );
                      }
                      return <span key={j}>{sub}</span>;
                    })}
                  </span>
                );
              })}
            </div>
          );
        })}
      </>
    );
  };

  const handleFileChange = (info) => {
    const { file } = info;

    if (file.originFileObj) {
      setUploadedFile(file.originFileObj);
    } else if (file instanceof File) {
      setUploadedFile(file);
    }
  };

  const beforeUpload = (file) => {
    const isPdf = file.type === 'application/pdf';
    if (!isPdf) {
      message.error(t('exams.onlyPdfAllowed'));
      return false;
    }
    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error(t('exams.fileTooLarge'));
      return false;
    }
    return false;
  };

  const getPublicIdFromUrl = (url) => {
    try {
      if (!url) return null;
      const splitUrl = url.split('/');
      const lastPart = splitUrl[splitUrl.length - 1];
      const publicIdWithExtension = lastPart.split('.')[0];

      const regex = /\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z]+$/;
      const match = url.match(regex);
      if (match && match[1]) {
        return match[1];
      }
      return null;
    } catch (e) {
      console.error('Error extracting public_id', e);
      return null;
    }
  };

  const beforeImageUpload = (file) => {
    const isImage = file.type?.startsWith('image/');
    if (!isImage) {
      console.error('Invalid file type:', file.type);
      message.error(t('exams.onlyImageAllowed') || 'Chỉ chấp nhận file ảnh (JPG/PNG/GIF)!');
      return false;
    }
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error(t('exams.imageTooLarge') || 'Ảnh phải nhỏ hơn 5MB!');
      return false;
    }
    return true;
  };

  const handleParsePdf = async () => {
    if (!uploadedFile) {
      message.error(t('exams.pleaseUploadFile'));
      return;
    }

    setParsing(true);
    try {
      const result = await pdfExamService.uploadPdfForParsing(uploadedFile);

      if (result.ok && result.data) {
        setParsedData(result.data);

        const questions = [];
        result.data.pages?.forEach(page => {
          page.questions?.forEach(q => {
            questions.push({
              ...q,
              pageNumber: page.pageNumber
            });
          });
        });

        setAllQuestions(questions);

        const initialAnswers = {};
        questions.forEach(q => {
          if (q.answers && q.answers.length > 0) {
            initialAnswers[q.questionNumber] = q.correctAnswer || q.answers[0].key || 'A';
          }
        });
        setSelectedAnswers(initialAnswers);

        setCurrentStep(1);
        message.success(t('exams.pdfParsedSuccess', { count: result.data.totalQuestions }));
      } else {
        const errorMsg = result.message || 'Parsing failed';
        console.error('Parsing failed:', errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('Error parsing PDF:', error);
      const errorMessage = error.response?.data?.message
        || error.message
        || t('exams.parsingFailed');
      message.error(errorMessage);
    } finally {
      setParsing(false);
    }
  };

  const handleAnswerChange = (questionNumber, answerKey) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionNumber]: answerKey
    }));
  };

  const handleOpenPreview = (imageUrl, pageNumber) => {
    setPreviewTitle(`Trang ${pageNumber} - Ảnh gốc`);
    setPreviewImage(imageUrl);
    setPreviewVisible(true);
  };

  const handleEditClick = (question) => {
    setEditingQuestion(question);
    setEditModalVisible(true);

    const initialValues = {
      questionText: question.questionText,
      explanation: question.explanation,
      answerA: question.answers.find(a => a.key === 'A' || a.letter === 'A')?.text || '',
      answerB: question.answers.find(a => a.key === 'B' || a.letter === 'B')?.text || '',
      answerC: question.answers.find(a => a.key === 'C' || a.letter === 'C')?.text || '',
      answerD: question.answers.find(a => a.key === 'D' || a.letter === 'D')?.text || '',
      correctAnswer: selectedAnswers[question.questionNumber] || question.correctAnswer || 'A'
    };

    const initImages = question.images ? [...question.images] : (question.image ? [question.image] : []);
    setEditingImages(initImages);

    const initChoiceImages = {};
    question.answers.forEach(ans => {
      const key = ans.key || ans.letter;
      if (ans.image) initChoiceImages[key] = ans.image;
    });
    setEditingChoiceImages(initChoiceImages);

    editForm.setFieldsValue(initialValues);

    setPreviewData({
      text: initialValues.questionText,
      choices: [
        { text: initialValues.answerA, image: initChoiceImages['A'] || '' },
        { text: initialValues.answerB, image: initChoiceImages['B'] || '' },
        { text: initialValues.answerC, image: initChoiceImages['C'] || '' },
        { text: initialValues.answerD, image: initChoiceImages['D'] || '' }
      ],
      answer: initialValues.correctAnswer === 'A' ? 0 :
        (initialValues.correctAnswer === 'B' ? 1 :
          (initialValues.correctAnswer === 'C' ? 2 : 3)),
      explanation: initialValues.explanation,
      type: 'mcq',
      images: initImages
    });
  };

  const handleEditQuestionImageUpload = async ({ file, onSuccess, onError }) => {
    try {
      setUploading(true);
      const response = await uploadService.uploadImage(file);
      if (response && response.data && response.data.url) {
        const imageUrl = response.data.url;
        setEditingImages(prev => {
          const newImages = [...prev, imageUrl];
          setPreviewData(prevPreview => ({ ...prevPreview, images: newImages }));
          return newImages;
        });

        onSuccess(null, file);
        message.success('Image uploaded');
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

  const removeEditQuestionImage = (index) => {
    const imageToDelete = editingImages[index];

    setEditingImages(prev => {
      const newImages = prev.filter((_, i) => i !== index);
      setPreviewData(prevPreview => ({ ...prevPreview, images: newImages }));
      return newImages;
    });

    if (imageToDelete) {
      const publicId = getPublicIdFromUrl(imageToDelete);
      if (publicId) {
        uploadService.deleteImage(publicId).then(() => {
          // Silent success
        }).catch(err => {
          console.error('Failed to delete image from cloud', err);
          message.error('Failed to delete image from cloud storage');
        });
      }
    }
  };

  const handleEditChoiceImageUpload = async (key, { file, onSuccess, onError }) => {
    try {
      setUploading(true);
      const response = await uploadService.uploadImage(file);
      if (response && response.data && response.data.url) {
        const imageUrl = response.data.url;
        setEditingChoiceImages(prev => {
          const newChoiceImages = { ...prev, [key]: imageUrl }
          setPreviewData(prevPreview => {
            const newChoices = [...prevPreview.choices];
            const idx = key === 'A' ? 0 : (key === 'B' ? 1 : (key === 'C' ? 2 : 3));
            newChoices[idx] = { ...newChoices[idx], image: imageUrl };
            return { ...prevPreview, choices: newChoices };
          });
          return newChoiceImages;
        });

        onSuccess(null, file);
        message.success(`Choice ${key} image uploaded`);
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

  const removeEditChoiceImage = (key) => {
    const imageToDelete = editingChoiceImages[key];

    setEditingChoiceImages(prev => {
      const newChoiceImages = { ...prev };
      delete newChoiceImages[key];

      setPreviewData(prevPreview => {
        const newChoices = [...prevPreview.choices];
        const idx = key === 'A' ? 0 : (key === 'B' ? 1 : (key === 'C' ? 2 : 3));
        newChoices[idx] = { ...newChoices[idx], image: '' };
        return { ...prevPreview, choices: newChoices };
      });

      return newChoiceImages;
    });

    if (imageToDelete) {
      const publicId = getPublicIdFromUrl(imageToDelete);
      if (publicId) {
        uploadService.deleteImage(publicId).then(() => { }).catch(err => {
          console.error('Failed to delete image from cloud', err);
        });
      }
    }
  };

  const handleEditFormValuesChange = (changedValues, allValues) => {
    const choices = [
      { text: allValues.answerA, image: editingChoiceImages['A'] || '' },
      { text: allValues.answerB, image: editingChoiceImages['B'] || '' },
      { text: allValues.answerC, image: editingChoiceImages['C'] || '' },
      { text: allValues.answerD, image: editingChoiceImages['D'] || '' }
    ];

    const answerIndex = allValues.correctAnswer === 'A' ? 0 :
      (allValues.correctAnswer === 'B' ? 1 :
        (allValues.correctAnswer === 'C' ? 2 : 3));

    setPreviewData({
      text: allValues.questionText,
      choices: choices,
      answer: answerIndex,
      explanation: allValues.explanation,
      type: 'mcq',
      images: editingImages,
    });
  };

  const handleSaveEdit = async () => {
    try {
      const values = await editForm.validateFields();

      const updatedQuestions = allQuestions.map(q => {
        if (q.questionNumber === editingQuestion.questionNumber) {
          const newAnswers = [
            { key: 'A', text: values.answerA, isCorrect: values.correctAnswer === 'A', image: editingChoiceImages['A'] },
            { key: 'B', text: values.answerB, isCorrect: values.correctAnswer === 'B', image: editingChoiceImages['B'] },
            { key: 'C', text: values.answerC, isCorrect: values.correctAnswer === 'C', image: editingChoiceImages['C'] },
            { key: 'D', text: values.answerD, isCorrect: values.correctAnswer === 'D', image: editingChoiceImages['D'] }
          ];

          return {
            ...q,
            questionText: values.questionText,
            explanation: values.explanation,
            correctAnswer: values.correctAnswer,
            answers: newAnswers,
            images: editingImages,
            image: editingImages.length > 0 ? null : (editingImages.length === 0 && !q.images ? null : q.image)
          };
        }
        return q;
      });

      setAllQuestions(updatedQuestions);

      handleAnswerChange(editingQuestion.questionNumber, values.correctAnswer);

      setEditModalVisible(false);
      setEditingQuestion(null);
      setPreviewData(null);
      setEditingImages([]);
      setEditingChoiceImages({});

      message.success(t('exams.questionUpdated') || "Cập nhật câu hỏi thành công");
    } catch (info) {
      // Validate failed
    }
  };

  const handleCreateExam = async (values) => {
    if (!allQuestions || allQuestions.length === 0) {
      message.error(t('exams.noDataToCreate'));
      return;
    }

    setCreating(true);
    try {
      const questionsToSubmit = allQuestions.map(q => {
        const answerKey = selectedAnswers[q.questionNumber] || q.answers[0]?.key || q.answers[0]?.letter || 'A';

        return {
          questionNumber: q.questionNumber,
          questionText: q.questionText,
          images: q.images || [],
          image: q.image || null,
          answers: q.answers.map(ans => ({
            key: ans.key || ans.letter,
            text: ans.text,
            image: ans.image || null,
            isCorrect: (ans.key || ans.letter) === answerKey
          })),
          correctAnswer: answerKey,
          explanation: q.explanation || '',
          level: q.level || 1,
          tags: q.tags || []
        };
      });

      const examData = {
        examName: values.examName,
        examDescription: values.examDescription || '',
        subjectId: values.subjectId,
        duration: values.duration,
        totalMarks: values.totalMarks,
        questions: questionsToSubmit,
        examPurpose: values.examPurpose || 'exam',
        isAllowUser: values.isAllowUser || 'everyone',
        maxAttempts: values.maxAttempts || 1,
        viewMark: values.viewMark !== undefined ? values.viewMark : 1,
        viewExamAndAnswer: values.viewExamAndAnswer !== undefined ? values.viewExamAndAnswer : 1,
        startTime: values.startTime ? values.startTime.toISOString() : undefined,
        endTime: values.endTime ? values.endTime.toISOString() : undefined
      };

      const result = await pdfExamService.createExamFromPdf(examData);

      if (result && (result.ok === true || result.exam || result._id)) {
        const examData = result.data?.exam || result.exam || result;
        message.success(t('exams.createSuccess'));
        setCurrentStep(2);

        setTimeout(() => {
          if (onSuccess) {
            onSuccess(examData);
          }
          handleModalClose();
        }, 2000);
      } else {
        const errorMsg = result?.message || result?.error?.message || result?.error || 'Creation failed';
        console.error('Create exam failed:', result);
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('Error creating exam:', error);
      let errorMessage = error.response?.data?.message
        || error.response?.data?.error
        || error.message
        || t('exams.createFailed');

      if (errorMessage && (errorMessage.includes('E11000') || errorMessage.includes('duplicate key'))) {
        errorMessage = t('exams.duplicateExamName') || "Tên đề thi đã tồn tại, vui lòng chọn tên khác.";
      }

      message.error(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  const handleModalClose = () => {
    setCurrentStep(0);
    setUploadedFile(null);
    setParsedData(null);
    setAllQuestions([]);
    setSelectedAnswers({});
    form.resetFields();
    if (onClose) {
      onClose();
    }
  };

  const totalMarks = Form.useWatch('totalMarks', form);
  const marksPerQuestion = totalMarks && allQuestions.length > 0
    ? parseFloat((totalMarks / allQuestions.length).toFixed(2))
    : 0;

  return (
    <>
      <Modal
        title={t('exams.uploadPdfExam')}
        open={open}
        onCancel={handleModalClose}
        width={1000}
        footer={null}
        destroyOnHidden
        style={{ top: 20 }}
      >
        <MathJaxContext config={mathJaxConfig}>
          <Steps current={currentStep} style={{ marginBottom: 24 }}>
            <Step title={t('exams.uploadFile')} icon={<FileOutlined />} />
            <Step title={t('exams.reviewQuestions')} icon={<CheckCircleOutlined />} />
            <Step title={t('exams.complete')} icon={<CheckCircleOutlined />} />
          </Steps>

          {/* Step 1: Upload PDF */}
          {currentStep === 0 && (
            <div>
              <Dragger
                name="file"
                multiple={false}
                accept=".pdf"
                beforeUpload={beforeUpload}
                onChange={handleFileChange}
                maxCount={1}
              >
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">{t('exams.clickOrDragPdf')}</p>
                <p className="ant-upload-hint">
                  {t('exams.pdfUploadHint')}
                </p>
              </Dragger>

              {uploadedFile && !parsing && (
                <Alert
                  message={t('exams.fileReady')}
                  description={`${uploadedFile.name} (${(uploadedFile.size / 1024 / 1024).toFixed(2)} MB)`}
                  type="success"
                  showIcon
                  style={{ marginTop: 16 }}
                />
              )}

              {parsing && (
                <Alert
                  message={t('exams.parsingInProgress') || 'Đang xử lý PDF...'}
                  description={t('exams.parsingHint') || 'AI đang trích xuất câu hỏi từ PDF. Quá trình này có thể mất 1-2 phút đối với file lớn. Vui lòng đợi...'}
                  type="info"
                  showIcon
                  style={{ marginTop: 16 }}
                />
              )}

              <div style={{ marginTop: 24, textAlign: 'right' }}>
                <Space>
                  <Button onClick={handleModalClose} disabled={parsing}>
                    {t('common.cancel')}
                  </Button>
                  <Button
                    type="primary"
                    onClick={handleParsePdf}
                    loading={parsing}
                    disabled={!uploadedFile || parsing}
                  >
                    {parsing ? t('exams.parsing') : t('exams.parsePdf')}
                  </Button>
                </Space>
              </div>
            </div>
          )}

          {/* Step 2: Review & Confirm */}
          {currentStep === 1 && parsedData && (
            <div>
              <Alert
                message={t('exams.reviewInstructions')}
                description={t('exams.reviewInstructionsDesc')}
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />

              <Form
                form={form}
                layout="vertical"
                onFinish={handleCreateExam}
                initialValues={{
                  duration: 60,
                  totalMarks: parsedData.totalQuestions || 100,
                  examPurpose: 'exam',
                  isAllowUser: 'everyone',
                  maxAttempts: 1,
                  viewMark: 1,
                  viewExamAndAnswer: 1,
                  startTime: null,
                  endTime: null
                }}
              >
                <Form.Item
                  name="examName"
                  label={t('exams.name')}
                  rules={[{ required: true, message: t('exams.nameRequired') }]}
                >
                  <Input placeholder={parsedData.filename?.replace('.pdf', '')} />
                </Form.Item>

                <Form.Item
                  name="examDescription"
                  label={t('exams.description')}
                >
                  <Input.TextArea rows={2} />
                </Form.Item>

                <Space style={{ width: '100%' }} size="large">
                  <Form.Item
                    name="subjectId"
                    label={t('exams.subject')}
                    rules={[{ required: true, message: t('exams.pleaseSelectSubject') }]}
                  >
                    <Select
                      style={{ width: 200 }}
                      placeholder={t('exams.selectSubject')}
                      showSearch
                      filterOption={(input, option) =>
                        (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                    >
                      {subjects?.map(subject => {
                        // Get subject name based on current language
                        const currentLang = i18n.language || 'vi';
                        let subjectName = subject.name;
                        
                        switch (currentLang) {
                          case 'en':
                            subjectName = subject.name_en || subject.name;
                            break;
                          case 'jp':
                            subjectName = subject.name_jp || subject.name;
                            break;
                          case 'vi':
                          default:
                            subjectName = subject.name;
                            break;
                        }
                        
                        return (
                          <Option key={subject._id || subject.id} value={subject._id || subject.id}>
                            {subjectName}
                          </Option>
                        );
                      })}
                    </Select>
                  </Form.Item>

                  <Form.Item
                    name="duration"
                    label={t('exams.duration')}
                    rules={[{ required: true, message: t('exams.pleaseEnterDuration') }]}
                  >
                    <InputNumber min={1} style={{ width: 120 }} addonAfter={t('exams.minutes')} />
                  </Form.Item>

                  <Form.Item
                    name="totalMarks"
                    label={t('exams.totalMarks')}
                    rules={[{ required: true, message: t('exams.pleaseEnterTotalMarks') }]}
                  >
                    <InputNumber min={1} style={{ width: 120 }} />
                  </Form.Item>
                </Space>

                <Space style={{ width: '100%', marginTop: 16 }} size="large">
                  <Form.Item
                    name="examPurpose"
                    label={t('exams.examPurpose')}
                    rules={[{ required: true, message: t('exams.examPurposeRequired') }]}
                  >
                    <Select style={{ width: 150 }}>
                      <Option value="exam">{t('exams.purposeExam')}</Option>
                      <Option value="practice">{t('exams.purposePractice')}</Option>
                      <Option value="quiz">{t('exams.purposeQuiz')}</Option>
                      <Option value="assignment">{t('exams.purposeAssignment')}</Option>
                    </Select>
                  </Form.Item>

                  <Form.Item
                    name="isAllowUser"
                    label={t('exams.isAllowUser')}
                    rules={[{ required: true, message: t('exams.isAllowUserRequired') }]}
                  >
                    <Select style={{ width: 150 }}>
                      <Option value="everyone">{t('exams.allowEveryone')}</Option>
                      <Option value="class">{t('exams.allowClass')}</Option>
                      <Option value="student">{t('exams.allowStudent')}</Option>
                    </Select>
                  </Form.Item>

                  <Form.Item
                    name="maxAttempts"
                    label={t('exams.maxAttempts')}
                    rules={[
                      { required: true, message: t('exams.maxAttemptsRequired') },
                      { type: 'number', min: 1, message: t('exams.maxAttemptsMin') }
                    ]}
                  >
                    <InputNumber min={1} style={{ width: 120 }} />
                  </Form.Item>
                </Space>

                <Space style={{ width: '100%', marginTop: 16 }} size="large">
                  <Form.Item
                    name="viewMark"
                    label={t('exams.viewMark')}
                    rules={[{ required: true, message: t('exams.viewMarkRequired') }]}
                  >
                    <Select style={{ width: 200 }}>
                      <Option value={0}>{t('exams.viewMarkNever')}</Option>
                      <Option value={1}>{t('exams.viewMarkAfterCompletion')}</Option>
                      <Option value={2}>{t('exams.viewMarkAfterAllFinish')}</Option>
                    </Select>
                  </Form.Item>

                  <Form.Item
                    name="viewExamAndAnswer"
                    label={t('exams.viewExamAndAnswer')}
                    rules={[{ required: true, message: t('exams.viewExamAndAnswerRequired') }]}
                  >
                    <Select style={{ width: 200 }}>
                      <Option value={0}>{t('exams.viewExamNever')}</Option>
                      <Option value={1}>{t('exams.viewExamAfterCompletion')}</Option>
                      <Option value={2}>{t('exams.viewExamAfterAllFinish')}</Option>
                    </Select>
                  </Form.Item>
                </Space>

                <Space style={{ width: '100%', marginTop: 16 }} size="large">
                  <Form.Item
                    name="startTime"
                    label={t('exams.startTime')}
                    rules={[{ required: true, message: t('exams.startTimeRequired') }]}
                  >
                    <DatePicker
                      showTime
                      format="YYYY-MM-DD HH:mm"
                      style={{ width: 200 }}
                      placeholder={t('exams.selectStartTime')}
                    />
                  </Form.Item>

                  <Form.Item
                    name="endTime"
                    label={t('exams.endTime')}
                    rules={[
                      { required: true, message: t('exams.endTimeRequired') },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || !getFieldValue('startTime')) {
                            return Promise.resolve();
                          }
                          if (value.isBefore(getFieldValue('startTime'))) {
                            return Promise.reject(new Error(t('exams.endTimeMustBeAfterStartTime')));
                          }
                          return Promise.resolve();
                        },
                      }),
                    ]}
                  >
                    <DatePicker
                      showTime
                      format="YYYY-MM-DD HH:mm"
                      style={{ width: 200 }}
                      placeholder={t('exams.selectEndTime')}
                    />
                  </Form.Item>
                </Space>
              </Form>

              <Card
                title={
                  <Space>
                    <span>{t('exams.questions')} ({allQuestions.length})</span>
                  </Space>
                }
                style={{ marginTop: 16, maxHeight: '60vh', overflowY: 'auto' }}
              >
                {allQuestions.length === 0 ? (
                  <Alert message={t('exams.noDataToCreate')} type="warning" />
                ) : (
                  <Space direction="vertical" style={{ width: '100%' }} size="large">
                    {allQuestions.map((question, index) => (
                      <Card
                        key={question.questionNumber || index}
                        size="small"
                        style={{
                          border: '1px solid #d9d9d9',
                          backgroundColor: '#fafafa'
                        }}
                      >
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <Space>
                              <strong>
                                {t('exams.question')} {question.questionNumber}:
                              </strong>
                              <Tag color={question.type === 'multiple-choice' ? 'blue' : 'orange'}>
                                {question.type === 'multiple-choice' ? t('exams.multipleChoice') : t('exams.essay')}
                              </Tag>
                            </Space>
                            <Space>
                              {marksPerQuestion > 0 && (
                                <Tag color="purple">
                                  {marksPerQuestion} {t('exams.marks')}
                                </Tag>
                              )}
                              <Button
                                icon={<EditOutlined />}
                                size="small"
                                onClick={() => handleEditClick(question)}
                              >
                                {t('common.edit') || "Chỉnh sửa"}
                              </Button>
                            </Space>
                          </div>

                          <div style={{ marginTop: 8, marginBottom: 12 }}>
                            {renderMathContent(question.questionText)}
                            {/* Render Question Images */}
                            {(question.images && question.images.length > 0) ? (
                              <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {question.images.map((img, idx) => (
                                  <img
                                    key={idx}
                                    src={img}
                                    alt={`Question ${question.questionNumber} - ${idx + 1}`}
                                    style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain', border: '1px solid #f0f0f0' }}
                                  />
                                ))}
                              </div>
                            ) : (question.image && (
                              <div style={{ marginTop: 12 }}>
                                <img
                                  src={question.image}
                                  alt={`Question ${question.questionNumber}`}
                                  style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain', border: '1px solid #f0f0f0' }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        {question.answers && question.answers.length > 0 && (
                          <>
                            <Divider style={{ margin: '12px 0' }} />

                            <div>
                              <Radio.Group
                                value={selectedAnswers[question.questionNumber]}
                                onChange={(e) => handleAnswerChange(question.questionNumber, e.target.value)}
                                style={{ width: '100%', display: 'flex', flexDirection: 'column' }}
                              >
                                {question.answers.map((answer) => {
                                  const answerKey = answer.key || answer.letter;
                                  const isSelected = selectedAnswers[question.questionNumber] === answerKey;
                                  const isAICorrect = answer.isCorrect === true;

                                  return (
                                    <Radio
                                      key={answerKey}
                                      value={answerKey}
                                      style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        marginBottom: 8
                                      }}
                                    >
                                      <div style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        width: '100%',
                                        gap: '8px'
                                      }}>
                                        <Tag
                                          color={isSelected ? 'blue' : (isAICorrect ? 'green' : 'default')}
                                          style={{ marginTop: 2 }}
                                        >
                                          {answerKey}
                                        </Tag>
                                        <div style={{
                                          flex: 1,
                                          wordWrap: 'break-word',
                                          overflowWrap: 'break-word'
                                        }}>
                                          {renderMathContent(answer.text)}
                                          {answer.image && (
                                            <div style={{ marginTop: 4 }}>
                                              <img
                                                src={answer.image}
                                                alt={`Answer ${answerKey}`}
                                                style={{ maxWidth: '100px', maxHeight: '100px', objectFit: 'contain', border: '1px solid #eee', borderRadius: 4 }}
                                              />
                                            </div>
                                          )}
                                        </div>
                                        {isAICorrect && !isSelected && (
                                          <Tag color="green" style={{ fontSize: 11, marginTop: 2 }}>
                                            AI ✓
                                          </Tag>
                                        )}
                                      </div>
                                    </Radio>
                                  );
                                })}
                              </Radio.Group>
                            </div>
                          </>
                        )}

                        {question.explanation && (
                          <>
                            <Divider style={{ margin: '12px 0' }} />
                            <div style={{
                              backgroundColor: '#e6f7ff',
                              padding: '12px',
                              borderRadius: '4px',
                              borderLeft: '3px solid #1890ff'
                            }}>
                              <div style={{
                                fontWeight: 'bold',
                                marginBottom: 8,
                                color: '#1890ff',
                                fontSize: '13px'
                              }}>
                                {t('questions.explanation')}:
                              </div>
                              <div style={{
                                fontSize: '13px',
                                color: '#595959',
                                lineHeight: '1.6'
                              }}>
                                {renderMathContent(question.explanation)}
                              </div>
                            </div>
                          </>
                        )}
                      </Card>
                    ))}
                  </Space>
                )}
              </Card>

              <div style={{ marginTop: 24, textAlign: 'right' }}>
                <Space>
                  <Button onClick={() => setCurrentStep(0)}>
                    {t('common.back')}
                  </Button>
                  <Button
                    type="primary"
                    onClick={() => form.submit()}
                    loading={creating}
                  >
                    {creating ? t('exams.creating') : t('exams.createExam')}
                  </Button>
                </Space>
              </div>
            </div >
          )}

          {/* Step 3: Success */}
          {
            currentStep === 2 && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <CheckCircleOutlined style={{ fontSize: 72, color: '#52c41a' }} />
                <h2 style={{ marginTop: 24 }}>{t('exams.examCreatedSuccessfully')}</h2>
                <p>{t('exams.redirectingMessage')}</p>
                <Progress percent={100} status="success" style={{ marginTop: 24 }} />
              </div>
            )
          }
        </MathJaxContext >
      </Modal >

      {/* EDIT MODAL - SPLIT VIEW */}
      <Modal
        open={editModalVisible}
        title={t('questions.editQuestion')}
        onCancel={() => {
          setEditModalVisible(false);
          setPreviewData(null);
          setEditingImages([]);
          setEditingChoiceImages({});
        }}
        onOk={handleSaveEdit}
        width={1200}
        zIndex={1001}
        style={{ top: 20 }}
      >
        <Row gutter={24}>
          {/* Left: Editor */}
          <Col span={14}>
            <Form form={editForm} layout="vertical" onValuesChange={handleEditFormValuesChange}>
              <Form.Item
                name="questionText"
                label={t('questions.text')}
                rules={[{ required: true }]}
              >
                <MathJaxEditor
                  placeholder={t('questions.textPlaceholder')}
                  showToolbar={true}
                  rows={4}
                />
              </Form.Item>

              {/* Question Images Upload */}
              <Form.Item label={t('questions.images')}>
                <div style={{ marginBottom: 16 }}>
                  <Upload
                    name="image"
                    listType="picture-card"
                    className="avatar-uploader"
                    showUploadList={false}
                    customRequest={handleEditQuestionImageUpload}
                    beforeUpload={beforeImageUpload}
                  >
                    <div>
                      {uploading ? <LoadingOutlined /> : <PlusOutlined />}
                      <div style={{ marginTop: 8 }}>Upload</div>
                    </div>
                  </Upload>
                </div>
                {/* Image Gallery */}
                {editingImages && editingImages.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {editingImages.map((imgUrl, index) => (
                      <div key={index} style={{ position: 'relative', width: '100px', height: '100px', border: '1px solid #d9d9d9', padding: '4px', borderRadius: '4px' }}>
                        <img
                          src={imgUrl}
                          alt={`Question ${index + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            top: -5,
                            right: -5,
                            background: '#fff',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            zIndex: 1,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                          }}
                          onClick={() => removeEditQuestionImage(index)}
                        >
                          <DeleteOutlined style={{ color: 'red', fontSize: '16px' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Form.Item>

              <div style={{ marginBottom: 16 }}>
                <strong>Đáp án:</strong>
              </div>

              <Space direction="vertical" style={{ width: '100%' }}>
                {['A', 'B', 'C', 'D'].map(key => (
                  <div key={key} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <Form.Item
                        name={`answer${key}`}
                        label={`Lựa chọn ${key}`}
                        style={{ marginBottom: 0 }}
                      >
                        <MathJaxEditor
                          placeholder={`Nhập đáp án ${key}...`}
                          showToolbar={true}
                          rows={2}
                        />
                      </Form.Item>
                    </div>

                    {/* Choice Image Upload */}
                    <div style={{ marginTop: '30px', flexShrink: 0 }}>
                      <Upload
                        name={`choiceImage${key}`}
                        listType="picture-card"
                        showUploadList={false}
                        customRequest={(options) => handleEditChoiceImageUpload(key, options)}
                        beforeUpload={beforeImageUpload}
                        style={{ width: '60px', height: '60px', margin: 0 }}
                      >
                        {editingChoiceImages[key] ? (
                          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                            <img
                              src={editingChoiceImages[key]}
                              alt="choice"
                              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }}
                            />
                            <div
                              style={{
                                position: 'absolute',
                                top: -4,
                                right: -4,
                                background: '#fff',
                                borderRadius: '50%',
                                cursor: 'pointer',
                                zIndex: 1,
                                padding: '2px',
                                lineHeight: 0,
                                boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                removeEditChoiceImage(key);
                              }}
                            >
                              <DeleteOutlined style={{ color: 'red', fontSize: '10px' }} />
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            {uploading ? <LoadingOutlined /> : <PlusOutlined />}
                          </div>
                        )}
                      </Upload>
                    </div>
                  </div>
                ))}
              </Space>

              <Form.Item
                name="correctAnswer"
                label={t('questions.correctAnswer')}
                rules={[{ required: true }]}
                style={{ marginTop: 16 }}
              >
                <Select>
                  <Option value="A">Đáp án A</Option>
                  <Option value="B">Đáp án B</Option>
                  <Option value="C">Đáp án C</Option>
                  <Option value="D">Đáp án D</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="explanation"
                label={t('questions.explanation')}
              >
                <MathJaxEditor
                  placeholder={t('questions.explanationPlaceholder')}
                  showToolbar={true}
                  rows={3}
                />
              </Form.Item>
            </Form>
          </Col>

          {/* Right: Preview */}
          <Col span={10}>
            <div style={{
              position: 'sticky',
              top: 0
            }}>
              <Card
                title={t('questions.preview')}
                size="small"
                styles={{ header: { backgroundColor: '#f0f2f5' } }}
              >
                {previewData && (
                  <QuestionPreview
                    questionData={previewData}
                    index={editingQuestion?.questionNumber || 1}
                  />
                )}
              </Card>
            </div>
          </Col>
        </Row>
      </Modal>

      {/* Image Preview Modal */}
      <Modal
        open={previewVisible}
        title={previewTitle}
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        width={1000}
        centered
        zIndex={2000}
        styles={{ body: { padding: 0, overflow: 'hidden' } }}
      >
        {previewImage && (
          <div style={{ display: 'flex', justifyContent: 'center', backgroundColor: '#f0f2f5', padding: '20px' }}>
            <img
              alt="example"
              style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
              src={previewImage}
            />
          </div>
        )}
      </Modal>
    </>
  );
};

UploadPdfModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func,
  onSuccess: PropTypes.func,
  subjects: PropTypes.arrayOf(PropTypes.shape({
    _id: PropTypes.string,
    id: PropTypes.string,
    name: PropTypes.string
  }))
};

export default UploadPdfModal;
