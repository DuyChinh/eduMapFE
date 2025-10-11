# 🛣️ Routes Structure

## 📁 Organization

```
src/routes/
└── index.jsx          # Main routes configuration
```

## 📝 Routes Configuration

### File: `index.jsx`

Chứa toàn bộ routing configuration của app, được tách ra khỏi `App.jsx` để:
- ✅ **Code organization**: Tách biệt routing logic
- ✅ **Maintainability**: Dễ maintain và scale
- ✅ **Reusability**: Có thể reuse routing logic
- ✅ **Clarity**: App.jsx clean hơn, chỉ focus vào setup providers

## 🗺️ Current Routes

### Public Routes (No Auth Required)
```
/login              → Login page
/register           → Register page  
/forgot-password    → Forgot password page
/reset-password     → Reset password page (with token query)
```

### Protected Routes - Teacher
```
/teacher/dashboard  → Teacher dashboard
/teacher/questions  → Question bank management
/teacher/exams      → Exam management
/teacher/classes    → Class management
```

### Protected Routes - Student
```
/student/dashboard  → Student dashboard
/student/classes    → My classes & join class
/student/results    → Exam results history
```

### Special Routes
```
/                   → Root redirect (based on auth status & role)
/*                  → 404 redirect to root
```

## 🔐 Protection Logic

### `ProtectedRoute` Component
Located in: `src/components/common/ProtectedRoute.jsx`

**Features**:
- Check authentication status
- Check user role authorization
- Auto redirect based on role
- Fallback to login if unauthorized

**Usage in routes**:
```jsx
<Route
  path="/teacher"
  element={
    <ProtectedRoute allowedRoles={[USER_ROLES.TEACHER]}>
      <TeacherLayout />
    </ProtectedRoute>
  }
>
  {/* Nested routes */}
</Route>
```

### `RootRedirect` Component
Located in: `src/routes/index.jsx`

**Logic**:
```
NOT authenticated → /login
Teacher          → /teacher/dashboard
Student          → /student/dashboard
Unknown role     → /login (fallback)
```

## 🎯 How to Add New Routes

### 1. Add Public Route
```jsx
// In src/routes/index.jsx
import NewPage from '../pages/NewPage';

<Route path="/new-page" element={<NewPage />} />
```

### 2. Add Protected Route (Teacher)
```jsx
// Import the page
import NewTeacherPage from '../pages/teacher/NewTeacherPage';

// Add to teacher routes
<Route
  path="/teacher"
  element={
    <ProtectedRoute allowedRoles={[USER_ROLES.TEACHER]}>
      <TeacherLayout />
    </ProtectedRoute>
  }
>
  {/* ... existing routes */}
  <Route path="new-page" element={<NewTeacherPage />} />
</Route>
```

### 3. Add Protected Route (Student)
```jsx
// Import the page
import NewStudentPage from '../pages/student/NewStudentPage';

// Add to student routes
<Route
  path="/student"
  element={
    <ProtectedRoute allowedRoles={[USER_ROLES.STUDENT]}>
      <StudentLayout />
    </ProtectedRoute>
  }
>
  {/* ... existing routes */}
  <Route path="new-page" element={<NewStudentPage />} />
</Route>
```

### 4. Update ROUTES constant
```jsx
// In src/constants/config.js
export const ROUTES = {
  // ... existing routes
  NEW_ROUTE: '/new-route',
};
```

## 🔄 Navigation Examples

### Programmatic Navigation
```jsx
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../constants/config';

const MyComponent = () => {
  const navigate = useNavigate();
  
  // Navigate to route
  navigate(ROUTES.TEACHER_DASHBOARD);
  
  // Navigate and replace history
  navigate(ROUTES.LOGIN, { replace: true });
  
  // Navigate with state
  navigate(ROUTES.STUDENT_RESULTS, { 
    state: { examId: '123' } 
  });
};
```

### Link Navigation
```jsx
import { Link } from 'react-router-dom';
import { ROUTES } from '../constants/config';

<Link to={ROUTES.LOGIN}>Login</Link>
```

## 📊 Route Hierarchy

```
App.jsx (ConfigProvider + AntdApp + Router)
  └── routes/index.jsx (AppRoutes)
      ├── Public Routes
      │   ├── /login
      │   ├── /register
      │   ├── /forgot-password
      │   └── /reset-password
      │
      ├── Teacher Routes (Protected)
      │   └── /teacher
      │       ├── TeacherLayout (Sidebar + Header)
      │       └── Nested Routes
      │           ├── /dashboard
      │           ├── /questions
      │           ├── /exams
      │           └── /classes
      │
      └── Student Routes (Protected)
          └── /student
              ├── StudentLayout (Sidebar + Header)
              └── Nested Routes
                  ├── /dashboard
                  ├── /classes
                  └── /results
```

## 🎨 Layout Integration

### Nested Layouts
Routes use nested layouts pattern:
- Parent route has layout component
- Child routes rendered inside layout's `<Outlet />`

**Example**:
```jsx
// Parent route with layout
<Route path="/teacher" element={<TeacherLayout />}>
  {/* Child routes */}
  <Route path="dashboard" element={<TeacherDashboard />} />
</Route>
```

### Layout Components
- `TeacherLayout`: Sidebar + Header for teachers
- `StudentLayout`: Sidebar + Header for students

## 🚀 Benefits of This Structure

### ✅ Separation of Concerns
- App.jsx: Provider setup only
- routes/: Routing logic
- components/: UI components
- pages/: Page components

### ✅ Scalability
- Easy to add new routes
- Easy to modify existing routes
- No need to touch App.jsx

### ✅ Maintainability
- All routes in one place
- Easy to see full routing structure
- Clear route organization

### ✅ Type Safety (Future)
- Can add TypeScript for route types
- Autocomplete for route paths
- Compile-time route validation

## 🔮 Future Enhancements

### 1. Route-based Code Splitting
```jsx
const TeacherDashboard = lazy(() => 
  import('../pages/teacher/TeacherDashboard')
);

<Route 
  path="dashboard" 
  element={
    <Suspense fallback={<Loading />}>
      <TeacherDashboard />
    </Suspense>
  } 
/>
```

### 2. Route Guards
```jsx
const AdminRoute = ({ children }) => {
  // Check admin permissions
  return isAdmin ? children : <Navigate to="/403" />;
};
```

### 3. Dynamic Routes
```jsx
<Route path="exams/:id" element={<ExamDetail />} />
<Route path="classes/:classId/students" element={<Students />} />
```

### 4. Route Transitions
```jsx
import { CSSTransition } from 'react-transition-group';

<CSSTransition timeout={300}>
  <Routes />
</CSSTransition>
```

## 📚 Related Files

- `src/App.jsx` - Main app wrapper
- `src/constants/config.js` - Route constants
- `src/components/common/ProtectedRoute.jsx` - Route protection
- `src/layouts/TeacherLayout.jsx` - Teacher layout
- `src/layouts/StudentLayout.jsx` - Student layout

---

**Last Updated**: After refactoring routes structure

