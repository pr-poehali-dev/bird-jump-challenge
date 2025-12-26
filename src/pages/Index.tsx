import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';

interface Obstacle {
  id: number;
  x: number;
  gapY: number;
}

type Difficulty = 'easy' | 'medium' | 'hard';

const DIFFICULTY_SETTINGS = {
  easy: {
    obstacleSpeed: 1.5,
    obstacleInterval: 2500,
    gapSize: 30,
    label: 'Лёгкий',
    color: 'from-green-400 to-emerald-500',
    icon: '🌱'
  },
  medium: {
    obstacleSpeed: 2,
    obstacleInterval: 2000,
    gapSize: 25,
    label: 'Средний',
    color: 'from-amber-400 to-orange-500',
    icon: '⚡'
  },
  hard: {
    obstacleSpeed: 2.8,
    obstacleInterval: 1500,
    gapSize: 20,
    label: 'Сложный',
    color: 'from-red-400 to-rose-600',
    icon: '🔥'
  }
};

const Index = () => {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [birdY, setBirdY] = useState(50);
  const [birdVelocity, setBirdVelocity] = useState(0);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [showDifficultySelect, setShowDifficultySelect] = useState(false);
  
  const gameLoopRef = useRef<number>();
  const obstacleTimerRef = useRef<number>();
  const audioContextRef = useRef<AudioContext | null>(null);

  const playSound = (frequency: number, duration: number) => {
    if (!soundEnabled) return;
    
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  };

  const jump = () => {
    if (!gameStarted) {
      startGame();
      return;
    }
    if (gameOver) return;
    
    setBirdVelocity(-8);
    playSound(400, 0.1);
  };

  const startGame = (selectedDifficulty?: Difficulty) => {
    if (selectedDifficulty) {
      setDifficulty(selectedDifficulty);
    }
    setGameStarted(true);
    setGameOver(false);
    setScore(0);
    setBirdY(50);
    setBirdVelocity(0);
    setObstacles([]);
    setShowDifficultySelect(false);
    
    playSound(600, 0.2);
  };

  const resetGame = () => {
    setGameStarted(false);
    setGameOver(false);
    setScore(0);
    setBirdY(50);
    setBirdVelocity(0);
    setObstacles([]);
    setShowDifficultySelect(false);
  };

  useEffect(() => {
    const savedHighScore = localStorage.getItem('flappyHighScore');
    if (savedHighScore) {
      setHighScore(parseInt(savedHighScore));
    }
  }, []);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('flappyHighScore', score.toString());
    }
  }, [score, highScore]);

  useEffect(() => {
    if (!gameStarted || gameOver) return;

    gameLoopRef.current = window.setInterval(() => {
      setBirdY(prev => {
        const newY = prev + birdVelocity;
        if (newY > 90 || newY < 0) {
          setGameOver(true);
          playSound(200, 0.3);
          return prev;
        }
        return newY;
      });
      
      setBirdVelocity(prev => prev + 0.5);
      
      setObstacles(prev => {
        const settings = DIFFICULTY_SETTINGS[difficulty];
        const newObstacles = prev
          .map(obs => ({ ...obs, x: obs.x - settings.obstacleSpeed }))
          .filter(obs => obs.x > -10);
        
        prev.forEach(obs => {
          if (obs.x < 20 && obs.x > 18) {
            setScore(s => s + 1);
            playSound(800, 0.1);
          }
        });
        
        const birdLeft = 15;
        const birdRight = 20;
        const birdTop = birdY;
        const birdBottom = birdY + 8;
        
        const settings = DIFFICULTY_SETTINGS[difficulty];
        newObstacles.forEach(obs => {
          if (obs.x < birdRight && obs.x + 8 > birdLeft) {
            if (birdTop < obs.gapY || birdBottom > obs.gapY + settings.gapSize) {
              setGameOver(true);
              playSound(200, 0.3);
            }
          }
        });
        
        return newObstacles;
      });
    }, 30);

    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [gameStarted, gameOver, birdVelocity, birdY, difficulty]);

  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const settings = DIFFICULTY_SETTINGS[difficulty];
    obstacleTimerRef.current = window.setInterval(() => {
      setObstacles(prev => [
        ...prev,
        {
          id: Date.now(),
          x: 100,
          gapY: Math.random() * 50 + 15
        }
      ]);
    }, settings.obstacleInterval);

    return () => {
      if (obstacleTimerRef.current) clearInterval(obstacleTimerRef.current);
    };
  }, [gameStarted, gameOver, difficulty]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        jump();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameStarted, gameOver]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-400 via-blue-300 to-blue-200 overflow-hidden relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-20 h-20 bg-white/30 rounded-full animate-float" />
        <div className="absolute top-32 right-20 w-16 h-16 bg-white/20 rounded-full animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-40 left-1/3 w-24 h-24 bg-white/25 rounded-full animate-float" style={{ animationDelay: '2s' }} />
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg">
            🐦 Flappy Bird
          </h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm"
          >
            <Icon name={soundEnabled ? "Volume2" : "VolumeX"} className="text-white" />
          </Button>
        </div>

        {!gameStarted && !gameOver && (
          <Card className="max-w-md mx-auto p-8 text-center bg-white/90 backdrop-blur-sm shadow-2xl">
            {!showDifficultySelect ? (
              <>
                <div className="mb-6">
                  <div className="text-6xl mb-4 animate-bounce-bird">🐦</div>
                  <h2 className="text-3xl font-bold text-blue-600 mb-2">Добро пожаловать!</h2>
                  <p className="text-gray-600 mb-4">
                    Помогите птичке пролететь через деревья
                  </p>
                </div>
                
                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <Icon name="MousePointer2" className="text-blue-600" />
                    <span className="text-sm text-gray-700">Кликайте или нажимайте пробел</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <Icon name="Trophy" className="text-green-600" />
                    <span className="text-sm text-gray-700">Рекорд: {highScore}</span>
                  </div>
                </div>

                <Button
                  onClick={() => setShowDifficultySelect(true)}
                  size="lg"
                  className="w-full bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 text-white font-bold text-xl shadow-lg"
                >
                  Начать игру
                </Button>
              </>
            ) : (
              <>
                <div className="mb-6">
                  <Icon name="Target" size={48} className="text-blue-600 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-blue-600 mb-2">Выберите уровень</h2>
                  <p className="text-gray-600 text-sm">
                    Чем выше сложность, тем больше очков
                  </p>
                </div>

                <div className="space-y-3 mb-6">
                  {(Object.keys(DIFFICULTY_SETTINGS) as Difficulty[]).map((diff) => {
                    const settings = DIFFICULTY_SETTINGS[diff];
                    return (
                      <Button
                        key={diff}
                        onClick={() => startGame(diff)}
                        size="lg"
                        className={`w-full bg-gradient-to-r ${settings.color} hover:opacity-90 text-white font-bold text-lg shadow-lg transition-all hover:scale-105`}
                      >
                        <span className="mr-2 text-2xl">{settings.icon}</span>
                        {settings.label}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  onClick={() => setShowDifficultySelect(false)}
                  variant="ghost"
                  className="text-gray-500"
                >
                  Назад
                </Button>
              </>
            )}
          </Card>
        )}

        {gameStarted && (
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-4">
              <div className="bg-white/90 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg">
                <span className="text-2xl font-bold text-blue-600">Счёт: {score}</span>
              </div>
              <div className="bg-white/90 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg">
                <span className="text-lg font-semibold text-amber-600">🏆 {highScore}</span>
              </div>
            </div>

            <div
              className="relative w-full h-[500px] bg-gradient-to-b from-sky-300 to-sky-200 rounded-3xl overflow-hidden cursor-pointer shadow-2xl border-4 border-white/50"
              onClick={jump}
            >
              <div
                className="absolute w-12 h-12 text-4xl transition-all duration-75"
                style={{
                  left: '15%',
                  top: `${birdY}%`,
                  transform: `rotate(${Math.min(birdVelocity * 3, 45)}deg)`
                }}
              >
                🐦
              </div>

              {obstacles.map(obs => (
                <div key={obs.id} className="absolute" style={{ left: `${obs.x}%`, width: '8%' }}>
                  <div
                    className="absolute w-full bg-gradient-to-b from-green-600 to-green-700 rounded-b-lg shadow-lg"
                    style={{
                      height: `${obs.gapY}%`,
                      top: 0
                    }}
                  >
                    <div className="absolute bottom-0 w-full h-8 bg-green-800 rounded-b-lg" />
                  </div>
                  <div
                    className="absolute w-full bg-gradient-to-t from-green-600 to-green-700 rounded-t-lg shadow-lg"
                    style={{
                      height: `${100 - obs.gapY - DIFFICULTY_SETTINGS[difficulty].gapSize}%`,
                      bottom: 0
                    }}
                  >
                    <div className="absolute top-0 w-full h-8 bg-green-800 rounded-t-lg" />
                  </div>
                </div>
              ))}

              <div className="absolute bottom-0 w-full h-16 bg-gradient-to-t from-amber-600 to-amber-400" />

              {gameOver && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                  <Card className="p-8 text-center bg-white/95 shadow-2xl max-w-sm">
                    <div className="text-6xl mb-4">😢</div>
                    <h3 className="text-3xl font-bold text-red-600 mb-2">Игра окончена!</h3>
                    <p className="text-xl text-gray-700 mb-1">Счёт: {score}</p>
                    {score === highScore && score > 0 && (
                      <p className="text-lg text-amber-600 font-semibold mb-4">🎉 Новый рекорд!</p>
                    )}
                    <Button
                      onClick={resetGame}
                      size="lg"
                      className="w-full mt-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold"
                    >
                      Попробовать снова
                    </Button>
                  </Card>
                </div>
              )}
            </div>

            <div className="mt-6 text-center">
              <p className="text-white/80 text-lg drop-shadow">
                Нажимайте пробел или кликайте для прыжка
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;