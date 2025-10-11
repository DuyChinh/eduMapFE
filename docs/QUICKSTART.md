# 🚀 Quick Start Guide - Azota Mini

## 📦 Installation

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# 3. Open browser
http://localhost:5173
```

## 🎯 Demo Accounts (Để test với Backend)

### Giáo viên
```
Email: teacher@example.com
Password: Teacher123!
```

### Học sinh
```
Email: student@example.com  
Password: Student123!
```

## 🏃‍♂️ Common Tasks

### 1. Tạo Component Mới

```javascript
// src/components/teacher/QuestionForm.jsx
import { Form, Input, Button } from 'antd';

const QuestionForm = () => {
  const onFinish = (values) => {
    console.log('Values:', values);
  };

  return (
    <Form onFinish={onFinish}>
      {/* Form items */}
    </Form>
  );
};

export default QuestionForm;
```

### 2. Thêm API Service

```javascript
// src/api/questionService.js
import axiosInstance from './axios';

const questionService = {
  createQuestion: async (data) => {
    return await axiosInstance.post('/questions', data);
  },
  
  getQuestions: async () => {
    return await axiosInstance.get('/questions');
  },
};

export default questionService;
```

### 3. Sử dụng API trong Component

```javascript
import { useState } from 'react';
import { message } from 'antd';
import questionService from '../api/questionService';

const MyComponent = () => {
  const [loading, setLoading] = useState(false);

  const handleCreate = async (data) => {
    setLoading(true);
    try {
      await questionService.createQuestion(data);
      message.success('Tạo thành công!');
    } catch (error) {
      message.error(error || 'Có lỗi xảy ra!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleCreate} loading={loading}>
      Tạo mới
    </Button>
  );
};
```

### 4. Thêm Route Mới

```javascript
// src/App.jsx
import NewPage from './pages/teacher/NewPage';

// Thêm vào Routes
<Route path="new-page" element={<NewPage />} />
```

### 5. Sử dụng Auth Store

```javascript
import useAuthStore from '../store/authStore';

const MyComponent = () => {
  const { user, isAuthenticated, logout } = useAuthStore();

  return (
    <div>
      {isAuthenticated ? (
        <>
          <p>Hello, {user.name}</p>
          <button onClick={logout}>Logout</button>
        </>
      ) : (
        <p>Please login</p>
      )}
    </div>
  );
};
```

## 🎨 UI Components (Ant Design)

### Form Example
```javascript
import { Form, Input, Button, message } from 'antd';

<Form
  layout="vertical"
  onFinish={(values) => {
    console.log(values);
    message.success('Success!');
  }}
>
  <Form.Item
    label="Name"
    name="name"
    rules={[{ required: true, message: 'Please input name!' }]}
  >
    <Input placeholder="Enter name" />
  </Form.Item>

  <Form.Item>
    <Button type="primary" htmlType="submit">
      Submit
    </Button>
  </Form.Item>
</Form>
```

### Modal Example
```javascript
import { Modal, Button } from 'antd';
import { useState } from 'react';

const [open, setOpen] = useState(false);

<>
  <Button onClick={() => setOpen(true)}>Open Modal</Button>
  
  <Modal
    title="Title"
    open={open}
    onOk={() => setOpen(false)}
    onCancel={() => setOpen(false)}
  >
    <p>Modal content</p>
  </Modal>
</>
```

### Table Example
```javascript
import { Table } from 'antd';

const columns = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Age', dataIndex: 'age', key: 'age' },
];

const data = [
  { key: '1', name: 'John', age: 32 },
  { key: '2', name: 'Jane', age: 28 },
];

<Table columns={columns} dataSource={data} />
```

## 🔧 Troubleshooting

### Problem: Port 5173 đã được sử dụng
```bash
# Solution: Kill process on port
lsof -ti:5173 | xargs kill -9

# Or change port in vite.config.js
export default defineConfig({
  server: { port: 3000 }
})
```

### Problem: Module not found
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Problem: Antd styles not working
```javascript
// Check main.jsx has this import
import 'antd/dist/reset.css'
```

### Problem: 401 Unauthorized
```javascript
// Check if token exists
const token = localStorage.getItem('auth_token');
console.log('Token:', token);

// Clear and re-login
localStorage.clear();
// Then login again
```

## 📝 Code Snippets

### Loading State Pattern
```javascript
const [loading, setLoading] = useState(false);
const [data, setData] = useState(null);
const [error, setError] = useState(null);

useEffect(() => {
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiService.getData();
      setData(result.data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };
  
  fetchData();
}, []);

if (loading) return <Spin />;
if (error) return <Alert type="error" message={error} />;
if (!data) return null;

return <div>{/* Render data */}</div>;
```

### Form with Validation
```javascript
const [form] = Form.useForm();

<Form form={form} onFinish={onFinish}>
  <Form.Item
    name="email"
    rules={[
      { required: true, message: 'Required!' },
      { type: 'email', message: 'Invalid email!' },
    ]}
  >
    <Input />
  </Form.Item>
</Form>

// Reset form
form.resetFields();

// Set values
form.setFieldsValue({ email: 'test@example.com' });
```

## 🎯 Next Steps

1. ✅ Đọc [README.md](./README.md) để hiểu tổng quan
2. ✅ Xem [STRUCTURE.md](./STRUCTURE.md) để hiểu cấu trúc
3. ✅ Đọc [API.md](./API.md) để biết các endpoints
4. 🚀 Bắt đầu code!

## 📚 Resources

- [React Docs](https://react.dev)
- [Ant Design Components](https://ant.design/components/overview)
- [React Router](https://reactrouter.com)
- [Zustand](https://github.com/pmndrs/zustand)
- [Axios](https://axios-http.com)

## 💡 Tips

- 🔥 Use React DevTools extension
- 🎨 Use Ant Design theme customization
- 📦 Keep components small and reusable
- 🧪 Test in browser DevTools before deploying
- 📝 Write meaningful commit messages
- 🚀 Keep dependencies updated

---

Happy Coding! 🎉

