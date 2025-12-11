import { Outlet } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import ChatWidget from '../components/ChatWidget/ChatWidget';

const GlobalLayout = () => {
    const { isAuthenticated } = useAuthStore();

    return (
        <>
            <Outlet />
            {isAuthenticated && <ChatWidget />}
        </>
    );
};

export default GlobalLayout;
