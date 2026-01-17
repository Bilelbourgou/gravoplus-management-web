import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { authApi } from '../services';
import { useAuthStore } from '../store/auth.store';
import './LoginPage.css';

const loginSchema = z.object({
  username: z.string().min(1, 'Nom d\'utilisateur requis'),
  password: z.string().min(1, 'Mot de passe requis'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.login(data.username, data.password);
      setAuth(response.user, response.token);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">
              <img src="/logo.png" alt="GravoPlus" className="logo-image-lg" />
            </div>
            <h1>GravoPlus</h1>
            <p>Gestion d'atelier de gravure</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <div className="login-error">
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="username">
                Nom d'utilisateur
              </label>
              <input
                id="username"
                type="text"
                className={`form-input ${errors.username ? 'error' : ''}`}
                placeholder="Entrez votre nom d'utilisateur"
                {...register('username')}
              />
              {errors.username && (
                <span className="form-error">{errors.username.message}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">
                Mot de passe
              </label>
              <div className="password-input-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className={`form-input ${errors.password ? 'error' : ''}`}
                  placeholder="Entrez votre mot de passe"
                  {...register('password')}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <span className="form-error">{errors.password.message}</span>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="spinner" />
              ) : (
                <>
                  <LogIn size={20} />
                  Se connecter
                </>
              )}
            </button>
          </form>

          <div className="login-footer">
            <p>Credentials de test:</p>
            <code>admin / admin123</code>
          </div>
        </div>
      </div>

      <div className="login-bg">
        <div className="login-bg-pattern" />
      </div>
    </div>
  );
}
