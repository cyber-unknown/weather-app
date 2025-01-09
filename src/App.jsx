import { useState, useEffect } from 'react';
import axios from 'axios';

const POSITION_API_KEY = import.meta.env.VITE_POSITION_API_KEY;
const WEATHER_API_KEY = import.meta.env.VITE_WEATHER_API_KEY;

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [coordinates, setCoordinates] = useState(null);
  const [weather, setWeather] = useState(null);
  const [address, setAddress] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getUserLocation();
  }, []);

  const getUserLocation = () => {
    setLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setCoordinates({ lat: latitude, lng: longitude });
          await fetchWeatherData(latitude, longitude);
          await reverseGeocode(latitude, longitude);
          setLoading(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          setError('Could not get your location. Please search for a location manually.');
          setLoading(false)
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    } else {
      setError('Geolocation is not supported by your browser. Please search for a location manually.');
      setLoading(false);
      
    }
  };

  const fetchWeatherData = async (lat, lng) => {
    try {
      console.log('Fetching weather data for:', lat, lng);
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${WEATHER_API_KEY}&units=metric`
      );
      
      const forecastResponse = await axios.get(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${WEATHER_API_KEY}&units=metric`
      );

      const combinedData = {
        current: response.data,
        hourly: forecastResponse.data.list.slice(0, 12).map(item => ({
          dt: item.dt,
          temp: item.main.temp,
          weather: item.weather,
        })),
        daily: forecastResponse.data.list.filter((item, index) => index % 8 === 0).slice(0, 8).map(item => ({
          dt: item.dt,
          temp: {
            max: item.main.temp_max,
            min: item.main.temp_min
          },
          weather: item.weather,
        }))
      };

      setWeather(combinedData);
      setError(null);
    } catch (error) {
      console.error('Error fetching weather:', error.response || error);
      setError('Failed to fetch weather data. Please try again later.');
    }
  };

  const searchLocations = async (query) => {
    if (!query) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      console.log('Searching locations for:', query);
      const response = await axios.get(
        `https://api.positionstack.com/v1/forward?access_key=${POSITION_API_KEY}&query=${encodeURIComponent(query)}`
      );
      console.log('Location data:', response.data);
      if (response.data && response.data.data) {
        setSuggestions(response.data.data);
      }
    } catch (error) {
      console.error('Error searching locations:', error.response || error);
      setError('Failed to search locations. Please try again.');
    }
    setLoading(false);
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await axios.get(
        `https://api.positionstack.com/v1/reverse?access_key=${POSITION_API_KEY}&query=${lat},${lng}`
      );
      if (response.data && response.data.data && response.data.data[0]) {
        const location = response.data.data[0];
        setAddress(formatAddress(location));
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error.response || error);
    }
  };

  const formatAddress = (location) => {
    const parts = [];
    if (location.name) parts.push(location.name);
    if (location.region) parts.push(location.region);
    if (location.country) parts.push(location.country);
    return parts.join(', ');
  };

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.length > 2) {
      await searchLocations(query);
    } else {
      setSuggestions([]);
    }
  };

  const handleLocationSelect = async (location) => {
    const lat = parseFloat(location.latitude);
    const lng = parseFloat(location.longitude);
    setCoordinates({ lat, lng });
    setAddress(formatAddress(location));
    setSuggestions([]);
    setSearchQuery(formatAddress(location));
    await fetchWeatherData(lat, lng);
  };

  const getWeatherIcon = (condition) => {
    const iconMap = {
      'clear sky': '☀️',
      'few clouds': '🌤️',
      'scattered clouds': '☁️',
      'broken clouds': '☁️',
      'overcast clouds': '☁️',
      'light rain': '🌧️',
      'rain': '🌧️',
      'snow': '🌨️',
    };
    return iconMap[condition] || '☁️';
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Search Bar */}
        <div className="relative z-50 backdrop-blur-md bg-white/10 rounded-2xl p-4 mb-8 mx-auto max-w-3xl">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearch}
              placeholder="Search for a location..."
              className="w-full px-6 py-4 bg-white/20 border border-white/10 rounded-xl text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-lg"
            />
            {loading && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
              </div>
            )}
          </div>
          {error && (
            <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-red-500/80 backdrop-blur-md rounded-lg text-white">
              {error}
            </div>
          )}
          {suggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-2">
              <div className="backdrop-blur-lg bg-gray-900/95 rounded-xl overflow-hidden shadow-2xl border border-white/10">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    onClick={() => handleLocationSelect(suggestion)}
                    className="px-6 py-4 hover:bg-white/10 cursor-pointer transition-colors"
                  >
                    {formatAddress(suggestion)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent"></div>
          </div>
        ) : weather ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Current Weather */}
            <div className="lg:col-span-2">
              <div className="backdrop-blur-md bg-white/10 rounded-2xl p-8 h-full">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-8">
                  <div>
                    <div className="text-white/70 text-lg mb-2">
                      {formatDate(weather.current.dt)}, {formatTime(weather.current.dt)}
                    </div>
                    <h1 className="text-5xl font-light mb-4">{address}</h1>
                    <div className="flex items-baseline gap-4">
                      <span className="text-8xl font-extralight">{Math.round(weather.current.main.temp)}°</span>
                      <span className="text-6xl">
                        {getWeatherIcon(weather.current.weather[0].description)}
                      </span>
                    </div>
                    <p className="text-2xl text-white/80 mt-4">
                      Feels like {Math.round(weather.current.main.feels_like)}°. 
                      {weather.current.weather[0].description}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                  <div className="backdrop-blur-md bg-white/5 rounded-xl p-6">
                    <p className="text-white/60 text-sm mb-2">Wind</p>
                    <p className="text-3xl font-light">{weather.current.wind.speed} m/s</p>
                  </div>
                  <div className="backdrop-blur-md bg-white/5 rounded-xl p-6">
                    <p className="text-white/60 text-sm mb-2">Humidity</p>
                    <p className="text-3xl font-light">{weather.current.main.humidity}%</p>
                  </div>
                  <div className="backdrop-blur-md bg-white/5 rounded-xl p-6">
                    <p className="text-white/60 text-sm mb-2">Visibility</p>
                    <p className="text-3xl font-light">{(weather.current.visibility / 1000).toFixed(1)} km</p>
                  </div>
                  <div className="backdrop-blur-md bg-white/5 rounded-xl p-6">
                    <p className="text-white/60 text-sm mb-2">Pressure</p>
                    <p className="text-3xl font-light">{weather.current.main.pressure} hPa</p>
                  </div>
                </div>

                <div className="bg-white/5 rounded-xl p-6 mt-8">
                  <h3 className="text-2xl font-semibold text-white mb-4">Location Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="backdrop-blur-md bg-white/5 rounded-xl p-6">
                      <p className="text-white/70 text-lg mb-2">Latitude</p>
                      <p className="text-3xl font-light text-white">{coordinates.lat.toFixed(4)}°</p>
                    </div>
                    <div className="backdrop-blur-md bg-white/5 rounded-xl p-6">
                      <p className="text-white/70 text-lg mb-2">Longitude</p>
                      <p className="text-3xl font-light text-white">{coordinates.lng.toFixed(4)}°</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Hourly Forecast */}
            <div className="backdrop-blur-md bg-white/10 rounded-2xl p-6 h-full">
              <h2 className="text-2xl font-semibold mb-6">Hourly Forecast</h2>
              <div className="space-y-4">
                {weather.hourly.map((hour, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-xl hover:bg-white/5 transition-colors">
                    <span className="text-lg text-white/70">{formatTime(hour.dt)}</span>
                    <span className="text-3xl">{getWeatherIcon(hour.weather[0].description)}</span>
                    <span className="text-xl font-light">{Math.round(hour.temp)}°</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Daily Forecast */}
            <div className="lg:col-span-3 backdrop-blur-md bg-white/10 rounded-2xl p-8">
              <h2 className="text-2xl font-semibold mb-6">8-Day Forecast</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {weather.daily.map((day, index) => (
                  <div key={index} className="backdrop-blur-md bg-white/5 rounded-xl p-6">
                    <p className="text-lg text-white/70 mb-3">{formatDate(day.dt)}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-4xl">{getWeatherIcon(day.weather[0].description)}</span>
                      <div className="text-right">
                        <span className="text-2xl">{Math.round(day.temp.max)}°</span>
                        <span className="text-xl text-white/60 ml-2">{Math.round(day.temp.min)}°</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-xl text-white/80">{error}</p>
            <button
              onClick={getUserLocation}
              className="mt-4 px-6 py-3 bg-blue-500/80 hover:bg-blue-600/80 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default App;
