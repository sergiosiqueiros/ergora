
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../../lib/supabase'

type Despacho = {
  id: string
  nombre: string
}

type Cliente = {
  id: string
  nombre: string
  email: string | null
  telefono: string | null
  created_at: string
}

export default function Clientes() {
  const [despachos, setDespachos] = useState<Despacho[]>([])
  const [despachoId, setDespachoId] = useState('')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    async function cargarDespachos() {
      const { data, error } = await supabase
        .from('despachos')
        .select('id, nombre')
        .order('nombre')

      if (error) {
        setMensaje(error.message)
        return
      }

      setDespachos(data ?? [])
      if (data?.length) {
        setDespachoId(data[0].id)
      }
    }

    void cargarDespachos()
  }, [])

  useEffect(() => {
    if (!despachoId) return

    let activo = true

    async function cargar() {
      setClientes([])
      setMensaje('')

      const { data, error } = await supabase
        .from('clientes')
        .select('id, nombre, email, telefono, created_at')
        .eq('despacho_id', despachoId)
        .order('created_at', { ascending: false })

      if (!activo) return

      if (error) {
        setMensaje(error.message)
      } else {
        setClientes(data ?? [])
      }
    }

    void cargar()

    return () => {
      activo = false
    }
  }, [despachoId])

  async function guardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!despachoId || nombre.trim().length < 2) {
      setMensaje('Selecciona un despacho y escribe un nombre válido')
      return
    }

    setGuardando(true)
    setMensaje('')

    const { data, error } = await supabase
      .from('clientes')
      .insert({
        despacho_id: despachoId,
        nombre: nombre.trim(),
        email: email.trim() || null,
        telefono: telefono.trim() || null
      })
      .select('id, nombre, email, telefono, created_at')
      .single()

    if (error) {
      setMensaje('No se pudo guardar: ' + error.message)
    } else {
      setClientes(actuales => [data, ...actuales])
      setNombre('')
      setEmail('')
      setTelefono('')
      setMensaje('Cliente registrado correctamente')
    }

    setGuardando(false)
  }

  return (
    <section style={{
      maxWidth: 680,
      margin: '32px auto',
      padding: 20,
      fontFamily: 'Arial, sans-serif'
    }}>
      <h2>Gestión de clientes</h2>

      <label htmlFor="despacho">Despacho</label>
      <select
        id="despacho"
        value={despachoId}
        onChange={e => setDespachoId(e.target.value)}
        style={{ display: 'block', margin: '10px 0 24px' }}
      >
        {despachos.length === 0 && (
          <option value="">Sin despachos autorizados</option>
        )}
        {despachos.map(d => (
          <option key={d.id} value={d.id}>
            {d.nombre}
          </option>
        ))}
      </select>

      <form onSubmit={guardar}>
        <h3>Nuevo cliente</h3>

        <label htmlFor="nombre">Nombre *</label>
        <input
          id="nombre"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          required
          minLength={2}
          maxLength={200}
        />

        <label htmlFor="correo">Correo</label>
        <input
          id="correo"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />

        <label htmlFor="telefono">Teléfono</label>
        <input
          id="telefono"
          value={telefono}
          onChange={e => setTelefono(e.target.value)}
        />

        <div style={{ marginTop: 16 }}>
          <button disabled={guardando || !despachoId}>
            {guardando ? 'Guardando...' : 'Registrar cliente'}
          </button>
        </div>
      </form>

      <p role="status">{mensaje}</p>

      <h3>Clientes registrados ({clientes.length})</h3>

      {clientes.length === 0 ? (
        <p>No hay clientes visibles en este despacho.</p>
      ) : (
        <ul>
          {clientes.map(c => (
            <li key={c.id}>
              <strong>{c.nombre}</strong>
              {c.email && <span> — {c.email}</span>}
              {c.telefono && <span> — {c.telefono}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
