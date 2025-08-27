"use client"

import { useCallback, useEffect, useState } from "react"
import type { Ticket, Urgency } from "@/lib/types"
import { getAccessToken } from "@auth0/nextjs-auth0"
import { BaseTicketForm, type TicketFormValues, type TicketFormErrors } from "./base-ticket-form"

type Props = {
  ticket: Ticket | null
  isOpen: boolean
  onClose: () => void
  onSuccess: (updated: Ticket | null) => void
}

const emptyValues: TicketFormValues = {
  title: "",
  description: "",
  urgency: "MEDIUM" as Urgency, 
  category: "",
  dueDate: undefined,
}

export function EditTicketForm({ ticket, isOpen, onClose, onSuccess }: Props) {
  const [values, setValues] = useState<TicketFormValues>(emptyValues)
  const [errors, setErrors] = useState<TicketFormErrors>({})
  const [loading, setLoading] = useState(false)

  const getAuthToken = useCallback(async () => {
    if (process.env.NODE_ENV === "development") return "local"
    return await getAccessToken()
  }, [])

  useEffect(() => {
    if (isOpen && ticket) {
      setValues({
        title: ticket.title,
        description: ticket.description,
        urgency: ticket.urgency as Urgency,
        category: ticket.category,
        dueDate: ticket.dueDate ? new Date(ticket.dueDate) : undefined,
      })
      setErrors({})
    }
  }, [isOpen, ticket])

  const onChange = (patch: Partial<TicketFormValues>) =>
    setValues((prev: any) => ({ ...prev, ...patch }))

  const validate = (): boolean => {
    const next: TicketFormErrors = {}
    if (!values.title.trim()) next.title = "Title is required"
    if (!values.description.trim()) next.description = "Description is required"
    if (!values.category.trim()) next.category = "Category is required"
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate() || !ticket) return
    setLoading(true)
    try {
      const accessToken = await getAuthToken()
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
        body: JSON.stringify(values),
      })
      if (!res.ok) throw new Error("Failed to update ticket")
      const data = await res.json().catch(() => ({}))
      onSuccess(data?.ticket ?? null)
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <BaseTicketForm
      isOpen={isOpen}
      onClose={onClose}
      values={values}
      errors={errors}
      loading={loading}
      onChange={onChange}
      onSubmit={onSubmit}
      titleText="Edit Ticket"
    />
  )
}
