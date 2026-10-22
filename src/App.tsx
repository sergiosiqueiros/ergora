
import Clientes from './features/clientes/Clientes'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import type { User } from '@supabase/supabase-js'

type Despacho = {
  id: string
  nombre: string
}

function App() {
  const [usuario, setUsuario] = useState<User | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [despachos, setDespachos] = useState<Despacho[]>([])
  const [mensaje, setMensaje] = useState('')
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let activo = true

    const iniciar = async () => {
      const { data, error } = await supabase.auth.getUser()

      if (!activo) return

      setUsuario(error ? null : data.user)
      setCargando(false)
    }

    void iniciar()

    const { data: listener } =
      supabase.auth.onAuthStateChange((_evento, sesion) => {
        if (!activo) return

        setUsuario(sesion?.user ?? null)
        setDespachos([])
        setMensaje('')
      })

    return () => {
      activo = false
      listener.subscription.unsubscribe()
    }
  }, [])

  async function iniciarSesion(e: React.FormEvent) {
    e.preventDefault()
    setMensaje('')
    setCargando(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      setMensaje('Error: ' + error.message)
    }

    setCargando(false)
  }

  async function cargarDespachos() {
    setMensaje('')
    setDespachos([])

    const { data, error } = await supabase
      .from('despachos')
      .select('id, nombre')
      .order('nombre')

    if (error) {
      setMensaje('Error: ' + error.message)
      return
    }

    setDespachos(data ?? [])
    setMensaje(`${data?.length ?? 0} despacho(s) accesible(s)`)
  }

  async function cerrarSesion() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      setMensaje('Error al cerrar sesión: ' + error.message)
    }
  }

  if (cargando) {
    return <main>Verificando sesión...</main>
  }

  return (
    <main style={{
      maxWidth: 520,
      margin: '60px auto',
      padding: 24,
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1>Érgora</h1>
      <p>Prueba de autenticación y aislamiento RLS</p>

      {!usuario ? (
        <form onSubmit={iniciarSesion}>
          <h2>Iniciar sesión</h2>

          <label htmlFor="email">Correo electrónico</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ display: 'block', width: '100%', marginBottom: 14 }}
          />

          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ display: 'block', width: '100%', marginBottom: 14 }}
          />

          <button type="submit">Entrar</button>
        </form>
      ) : (
        <section>
          <h2>Sesión iniciada</h2>
          <p><strong>Usuario:</strong> {usuario.email}</p>

          <button onClick={cargarDespachos}>
            Consultar mis despachos
          </button>

          <button
            onClick={cerrarSesion}
            style={{ marginLeft: 12 }}
          >
            Cerrar sesión
          </button>
          <Clientes key={usuario.id} />
          <h3>Despachos autorizados</h3>

          <ul>
            {despachos.map(d => (
              <li key={d.id}>
                {d.nombre}
                <small style={{ display: 'block' }}>
                  {d.id}
                </small>
              </li>
            ))}
          </ul>
        </section>
      )}

      {mensaje && <p role="status">{mensaje}</p>}
    </main>
  )
}

export default App
