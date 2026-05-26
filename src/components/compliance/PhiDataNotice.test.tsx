import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PhiDataNotice } from './PhiDataNotice';

function renderNotice() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <PhiDataNotice />
    </MemoryRouter>
  );
}

describe('PhiDataNotice', () => {
  it('renders the PHI notice and reserves bottom space', () => {
    renderNotice();

    expect(screen.getByRole('region', { name: /data use notice/i })).toBeInTheDocument();
    expect(screen.getByText(/not for protected health information/i)).toBeInTheDocument();
    expect(document.body.style.paddingBottom).toBe('88px');
  });

  it('dismisses and persists the notice for the session', () => {
    renderNotice();

    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));

    expect(screen.queryByRole('region', { name: /data use notice/i })).not.toBeInTheDocument();
    expect(sessionStorage.getItem('med_phi_notice_dismissed_v1')).toBe('1');
  });
});
