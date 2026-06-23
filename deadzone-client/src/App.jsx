import './App.css';
import { useCallback, useState } from 'react';
import { useDeadzoneController } from './app/useDeadzoneController';
import { Lobby } from './components/Lobby';
import { LoadingScreen } from './components/LoadingScreen';
import { MatchHud } from './components/MatchHud';

const INITIAL_ASSETS = [
  '/deadZone_Logo.png',
  '/Shadow_Logo.png',
  '/favicon.svg',
  '/icons.svg',
];

function App() {
  const [loadingComplete, setLoadingComplete] = useState(false);
  const { screen, lobbyProps, matchProps } = useDeadzoneController();
  const handleLoadingComplete = useCallback(() => setLoadingComplete(true), []);

  if (!loadingComplete) {
    return (
      <LoadingScreen
        assetUrls={INITIAL_ASSETS}
        backendUrl="http://127.0.0.1:8080/api/rooms"
        timedProgressMs={4200}
        onComplete={handleLoadingComplete}
      />
    );
  }

  return screen === 'match'
    ? <MatchHud {...matchProps} />
    : <Lobby screen={screen} {...lobbyProps} />;
}

export default App;
