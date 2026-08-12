import React from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CapturePositionGuide, getExteriorCameraPosition, getInteriorArea } from './CapturePositionGuide';

describe('CapturePositionGuide', () => {
  it('places frame zero in front of the vehicle', () => {
    const position = getExteriorCameraPosition(0, 24);
    expect(position.angleDegrees).toBe(0);
    expect(position.x).toBeCloseTo(100);
    expect(position.y).toBeCloseTo(22);
  });

  it('places the halfway frame behind the vehicle', () => {
    const position = getExteriorCameraPosition(12, 24);
    expect(position.angleDegrees).toBe(180);
    expect(position.x).toBeCloseTo(100);
    expect(position.y).toBeCloseTo(178);
  });

  it('maps interior steps to different cabin areas', () => {
    expect(getInteriorArea(0, 8)).toBe('dashboard');
    expect(getInteriorArea(1, 8)).toBe('steering');
    expect(getInteriorArea(6, 8)).toBe('rear-seats');
  });

  it('renders an accessible exterior diagram', () => {
    render(<CapturePositionGuide viewType="exterior" slotNumber={6} targetFrameCount={24} />);
    expect(screen.getByRole('img', { name: /posição externa da câmera em 90 graus/i })).toBeInTheDocument();
    expect(screen.getByText(/Ponto azul/)).toBeInTheDocument();
  });

  it('renders an accessible interior diagram', () => {
    render(<CapturePositionGuide viewType="interior" slotNumber={0} targetFrameCount={8} />);
    expect(screen.getByRole('img', { name: /área interna a fotografar: dashboard/i })).toBeInTheDocument();
    expect(screen.getByText(/Área azul/)).toBeInTheDocument();
  });
});
