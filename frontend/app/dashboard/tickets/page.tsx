"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
interface Ticket {
  id: string;
  title: string;
  description: string;
  category: string;
  urgency: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function CreateTicketPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [createdTicket, setCreatedTicket] = useState<Ticket | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showTicketList, setShowTicketList] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [editData, setEditData] = useState({
    title: "",
    description: "",
    category: "",
    urgency: "",
    status: "",
  });
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    urgency: "MEDIUM",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`http://localhost:4000/tickets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // TODO: Add auth token when available
          "Authorization": `Bearer local`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to create ticket");
      }

      const data = await response.json();
      console.log({data})
      
      // Store the created ticket
      setCreatedTicket(data.ticket);
      
      setMessage({
        type: 'success',
        text: `Ticket created successfully!`
      });

      // Reset form
      setFormData({
        title: "",
        description: "",
        category: "",
        urgency: "MEDIUM",
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to create ticket. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = () => {
    if (createdTicket) {
      setEditData({
        title: createdTicket.title,
        description: createdTicket.description,
        category: createdTicket.category,
        urgency: createdTicket.urgency,
        status: createdTicket.status,
      });
      setIsEditing(true);
      setMessage(null);
    }
  };

  const handleDelete = async (ticketId: string) => {
    try {
      const response = await fetch(`http://localhost:4000/tickets/${ticketId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          // TODO: Add auth token when available
          "Authorization": `Bearer local`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete ticket");
      }

      const data = await response.json();
      if(data.success) {
        setCreatedTicket(null)
      }
      console.log({data})
    } catch (error) {
      console.log(error)
    }
  }

  const handleUpdate = async () => {
    if (!createdTicket) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`http://localhost:4000/tickets/${createdTicket.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer local`,
        },
        body: JSON.stringify({
          ticketId: createdTicket.id,
          ...editData
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update ticket");
      }

      const data = await response.json();
      setCreatedTicket(data.ticket);
      setIsEditing(false);
      setMessage({
        type: 'success',
        text: 'Ticket updated successfully!'
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to update ticket. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setMessage(null);
  };

  const fetchTickets = async () => {
    setIsLoadingTickets(true);
    try {
      const response = await fetch(`http://localhost:4000/tickets`, {
        headers: {
          "Authorization": `Bearer local`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch tickets");
      }

      const data = await response.json();
      setTickets(data.tickets || []);
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to load tickets.'
      });
    } finally {
      setIsLoadingTickets(false);
    }
  };

  const toggleTicketList = () => {
    if (!showTicketList && tickets.length === 0) {
      fetchTickets();
    }
    setShowTicketList(!showTicketList);
  };

  return (
    <div className="container max-w-2xl mx-auto py-8">
      <div className="mb-4 flex justify-end">
        <Button 
          onClick={toggleTicketList} 
          variant="outline"
        >
          {showTicketList ? "Hide Tickets" : "View Tickets"}
        </Button>
      </div>

      {showTicketList && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>All Tickets</CardTitle>
            <CardDescription>
              {isLoadingTickets ? "Loading tickets..." : `${tickets.length} ticket(s) found`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingTickets ? (
              <div className="text-center py-4">Loading...</div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-4 text-gray-500">No tickets found</div>
            ) : (
              <div className="space-y-3">
                {tickets.map((ticket) => (
                  <div key={ticket.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold">{ticket.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{ticket.description}</p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <span className={`px-2 py-1 text-xs rounded ${
                          ticket.urgency === 'HIGH' ? 'bg-red-100 text-red-700' : 
                          ticket.urgency === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' : 
                          'bg-green-100 text-green-700'
                        }`}>
                          {ticket.urgency}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded ${
                          ticket.status === 'RESOLVED' ? 'bg-green-100 text-green-700' : 
                          ticket.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' : 
                          ticket.status === 'AWAITING_RESPONSE' ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {ticket.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>Category: {ticket.category}</span>
                      <span>Created: {new Date(ticket.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {tickets.length > 0 && (
              <Button 
                onClick={fetchTickets} 
                variant="outline" 
                className="w-full mt-4"
                disabled={isLoadingTickets}
              >
                Refresh
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Create New Ticket</CardTitle>
          <CardDescription>
            Submit a new support ticket for assistance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {message && (
            <div className={`p-4 mb-4 rounded ${
              message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {message.text}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Brief description of the issue"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Provide detailed information about your request"
                rows={5}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                placeholder="e.g., listing, contract, support"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="urgency">Urgency</Label>
              <Select
                value={formData.urgency}
                onValueChange={(value) => setFormData({ ...formData, urgency: value })}
              >
                <SelectTrigger id="urgency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Ticket"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {createdTicket && (
        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Created Ticket</CardTitle>
              <CardDescription>
                Ticket ID: {createdTicket.id}
              </CardDescription>
            </div>
            {!isEditing && (
              <div className="flex flex-col gap-2">
              <Button onClick={handleEdit} variant="outline" size="sm">
                Edit Ticket
              </Button>
              <Button onClick={() => handleDelete(createdTicket.id)} variant="outline" size="sm">
                Delete Ticket
              </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-title">Title</Label>
                  <Input
                    id="edit-title"
                    value={editData.title}
                    onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editData.description}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    rows={4}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-category">Category</Label>
                    <Input
                      id="edit-category"
                      value={editData.category}
                      onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-urgency">Urgency</Label>
                    <Select
                      value={editData.urgency}
                      onValueChange={(value) => setEditData({ ...editData, urgency: value })}
                    >
                      <SelectTrigger id="edit-urgency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="edit-status">Status</Label>
                  <Select
                    value={editData.status}
                    onValueChange={(value) => setEditData({ ...editData, status: value })}
                  >
                    <SelectTrigger id="edit-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ASSIGNED">Assigned</SelectItem>
                      <SelectItem value="AWAITING_RESPONSE">Awaiting Response</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="RESOLVED">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={handleUpdate} 
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    {isSubmitting ? "Updating..." : "Save Changes"}
                  </Button>
                  <Button 
                    onClick={handleCancelEdit} 
                    variant="outline"
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label className="text-sm text-gray-500">Title</Label>
                  <p className="font-medium">{createdTicket.title}</p>
                </div>
                
                <div>
                  <Label className="text-sm text-gray-500">Description</Label>
                  <p className="whitespace-pre-wrap">{createdTicket.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-500">Category</Label>
                    <p>{createdTicket.category}</p>
                  </div>
                  
                  <div>
                    <Label className="text-sm text-gray-500">Urgency</Label>
                    <p className={`font-medium ${
                      createdTicket.urgency === 'HIGH' ? 'text-red-600' : 
                      createdTicket.urgency === 'MEDIUM' ? 'text-yellow-600' : 
                      'text-green-600'
                    }`}>
                      {createdTicket.urgency}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-500">Status</Label>
                    <p>{createdTicket.status}</p>
                  </div>
                  
                  <div>
                    <Label className="text-sm text-gray-500">Created At</Label>
                    <p>{new Date(createdTicket.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}