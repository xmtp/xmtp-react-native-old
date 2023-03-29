import * as React from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import Xmtp from 'xmtp-react-native';
import HomePage from './HomePage';

const queryClient = new QueryClient();
Xmtp.configure('local');

/**
 * Root component for the example app.
 *
 * This attaches the react-query {@link QueryClient} to the app.
 */
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HomePage />
    </QueryClientProvider>
  );
}
