import { Outlet } from 'react-router-dom';

export default function LandingLayout() {
  return (
    <div className="min-h-screen w-full bg-ws-bg-darkest text-ws-text selection:bg-ws-primary selection:text-ws-bg-darkest">
      <Outlet />
    </div>
  );
}
