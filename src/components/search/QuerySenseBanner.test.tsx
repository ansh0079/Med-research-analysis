import { fireEvent, render, screen } from '@testing-library/react';
import type { QueryResolution } from '@types';
import { QuerySenseBanner } from './QuerySenseBanner';

const AMBIGUOUS: QueryResolution = {
  status: 'ambiguous',
  resolved: [],
  ambiguities: [
    {
      token: 'acs',
      assumed: 'acute coronary syndrome',
      assumedQuery: 'acute coronary syndrome management',
      alternatives: [
        { label: 'american cancer society', query: 'american cancer society management' },
        { label: 'acute compartment syndrome', query: 'acute compartment syndrome management' },
      ],
    },
  ],
};

describe('QuerySenseBanner', () => {
  it('says which sense is being shown and offers each alternative', () => {
    render(<QuerySenseBanner resolution={AMBIGUOUS} onTryQuery={jest.fn()} />);

    expect(screen.getByRole('status')).toHaveTextContent(/ACS.*can mean more than one thing.*showing acute coronary syndrome/i);
    expect(screen.getByRole('button', { name: /american cancer society/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /acute compartment syndrome/i })).toBeInTheDocument();
  });

  it('re-runs the search with the alternative sense spelled out', () => {
    const onTryQuery = jest.fn();
    render(<QuerySenseBanner resolution={AMBIGUOUS} onTryQuery={onTryQuery} />);

    fireEvent.click(screen.getByRole('button', { name: /acute compartment syndrome/i }));

    expect(onTryQuery).toHaveBeenCalledWith('acute compartment syndrome management');
  });

  it.each([
    ['clear', { status: 'clear', ambiguities: [], resolved: [] }],
    ['resolved', { status: 'resolved', ambiguities: [], resolved: [{ token: 'acs', sense: 'acute coronary syndrome' }] }],
    ['missing', null],
    ['undefined', undefined],
  ] as const)('renders nothing when the query is %s', (_label, resolution) => {
    const { container } = render(<QuerySenseBanner resolution={resolution as QueryResolution | null | undefined} onTryQuery={jest.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
