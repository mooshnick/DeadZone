import './App.css';
import { useDeadzoneController } from './app/useDeadzoneController';
import { Lobby } from './components/Lobby';
import { MatchHud } from './components/MatchHud';

function App() {
  const { screen, lobbyProps, matchProps } = useDeadzoneController();

  if (screen === 'lobby') {
    return <Lobby {...lobbyProps} />;
  }

  return <MatchHud {...matchProps} />;
}

export default App;
