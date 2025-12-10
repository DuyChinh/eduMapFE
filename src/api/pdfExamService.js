import axiosInstance from './axios';

/**
 * Upload PDF file and parse it to extract questions
 * @param {File} file - PDF file to upload
 * @returns {Promise} - Parsed data with questions and coordinates
 */
export const uploadPdfForParsing = async (file) => {
  const formData = new FormData();
  formData.append('pdf', file); // Must match backend route: upload.single('pdf')
  
  console.log('📤 Sending PDF to backend:', file.name, file.size);
  
  try {
    const response = await axiosInstance.post('/exams/upload-pdf', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    console.log('📥 Raw axios response:', response);
    console.log('📊 Response structure:', {
      ok: response.ok,
      hasData: !!response.data,
      dataKeys: response.data ? Object.keys(response.data) : []
    });
    
    // Axios interceptor already unwraps to response.data
    // Backend returns { ok, message, data }
    // After interceptor: response = { ok, message, data }
    return response;
  } catch (error) {
    console.error('❌ Service error:', error);
    throw error;
  }
};

/**
 * Create exam from parsed PDF data
 * @param {Object} data - Exam data with parsed questions
 * @returns {Promise} - Created exam
 */
export const createExamFromPdf = async (data) => {
  const response = await axiosInstance.post('/exams/create-from-pdf', data);
  return response.data || response;
};

const pdfExamService = {
  uploadPdfForParsing,
  createExamFromPdf
};

export default pdfExamService;

