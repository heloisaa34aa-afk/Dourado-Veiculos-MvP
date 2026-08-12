import React from 'react';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Vehicle360MobileCapture from './Vehicle360MobileCapture';

const captureService = vi.hoisted(() => ({
  getSession: vi.fn(),
  prepareUpload: vi.fn(),
  uploadSignedFrame: vi.fn(),
  confirmFrame: vi.fn(),
  rejectFrame: vi.fn(),
  finalizeSession: vi.fn(),
}));

vi.mock('../services/vehicle360Capture.service', () => ({
  vehicle360CaptureService: captureService,
}));

function renderCapture() {
  return render(
    <MemoryRouter initialEntries={['/captura-360/token-test']}>
      <Routes>
        <Route path="/captura-360/:token" element={<Vehicle360MobileCapture />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Vehicle360MobileCapture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    captureService.prepareUpload.mockResolvedValue({
      storagePath: '360-capture/session/0-capture.jpg',
      uploadToken: 'signed-token',
    });
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows an Edge Function failure locally instead of a white screen', async () => {
    captureService.getSession.mockRejectedValue(new Error('Sessão inválida ou expirada.'));
    renderCapture();
    expect(await screen.findByText('Não foi possível abrir a sessão')).toBeInTheDocument();
    expect(screen.getByText('Sessão inválida ou expirada.')).toBeInTheDocument();
  });

  it('resumes from the first missing slot in the middle', async () => {
    captureService.getSession.mockResolvedValue({
      session: { id: 's', view_type: 'exterior', target_frame_count: 4, status: 'active' },
      frames: [
        { slot_number: 0, status: 'confirmed', image_url: 'one.jpg' },
        { slot_number: 2, status: 'confirmed', image_url: 'three.jpg' },
      ],
    });
    renderCapture();
    expect(await screen.findByText('Foto 2 de 4')).toBeInTheDocument();
  });

  it('shows interior-specific instructions', async () => {
    captureService.getSession.mockResolvedValue({
      session: { id: 's', view_type: 'interior', target_frame_count: 8, status: 'active' },
      frames: [],
    });
    renderCapture();
    expect(await screen.findByText('Painel completo')).toBeInTheDocument();
    expect(screen.queryByText('0°')).not.toBeInTheDocument();
  });

  it('allows selecting and deleting a confirmed frame during review', async () => {
    captureService.getSession.mockResolvedValue({
      session: { id: 's', view_type: 'interior', target_frame_count: 2, status: 'active' },
      frames: [
        { slot_number: 0, status: 'confirmed', image_url: 'one.jpg' },
        { slot_number: 1, status: 'confirmed', image_url: 'two.jpg' },
      ],
    });
    captureService.rejectFrame.mockResolvedValue({ success: true, currentStep: 0 });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderCapture();
    expect(await screen.findByText('Revise antes de finalizar')).toBeInTheDocument();
    fireEvent.click(screen.getByAltText('Foto 1'));
    fireEvent.click(screen.getByRole('button', { name: /Excluir foto 1/ }));
    await waitFor(() => expect(captureService.rejectFrame).toHaveBeenCalledWith('token-test', 0));
    expect(captureService.getSession).toHaveBeenCalledTimes(1);
  });

  it('prepares the current upload before the employee confirms the photo', async () => {
    captureService.getSession.mockResolvedValue({
      session: { id: 's', view_type: 'exterior', target_frame_count: 24, status: 'active' },
      frames: [],
    });
    renderCapture();
    await screen.findByText('Foto 1 de 24');
    await waitFor(() => expect(captureService.prepareUpload).toHaveBeenCalledWith('token-test', 0));
  });

  it('allows an interior capture to finish at the safe minimum before its target', async () => {
    captureService.getSession.mockResolvedValue({
      session: { id: 's', view_type: 'interior', target_frame_count: 12, status: 'active' },
      frames: Array.from({ length: 8 }, (_, slot) => ({
        slot_number: slot,
        status: 'confirmed',
        image_url: `${slot}.jpg`,
      })),
    });
    captureService.finalizeSession.mockResolvedValue({ success: true });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderCapture();
    const button = await screen.findByRole('button', { name: /Finalizar com 8/ });
    fireEvent.click(button);
    await waitFor(() => expect(captureService.finalizeSession).toHaveBeenCalledWith('token-test'));
  });
});
