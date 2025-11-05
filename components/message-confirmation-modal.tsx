"use client"

import { useState } from "react"
import { CheckCircle2, XCircle, Edit2, Send } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface MessageConfirmationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  message: string
  onConfirm: (finalMessage: string) => void
  onCancel: () => void
}

export function MessageConfirmationModal({
  open,
  onOpenChange,
  message,
  onConfirm,
  onCancel,
}: MessageConfirmationModalProps) {
  const [editedMessage, setEditedMessage] = useState(message)
  const [isEditing, setIsEditing] = useState(false)

  const handleConfirm = () => {
    onConfirm(editedMessage)
    onOpenChange(false)
  }

  const handleCancel = () => {
    onCancel()
    onOpenChange(false)
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Confirmar Mensagem
          </DialogTitle>
          <DialogDescription>
            Revise a mensagem gerada pela conversa. Você pode editar antes de enviar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="message">Mensagem:</Label>
              {!isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEdit}
                  className="h-8 gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Editar
                </Button>
              )}
            </div>

            {isEditing ? (
              <Textarea
                id="message"
                value={editedMessage}
                onChange={(e) => setEditedMessage(e.target.value)}
                className="min-h-[200px] resize-none"
                placeholder="Digite sua mensagem..."
              />
            ) : (
              <div className="glass rounded-lg p-4 min-h-[200px] whitespace-pre-wrap text-sm">
                {editedMessage}
              </div>
            )}
          </div>

          {isEditing && (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(false)}
              >
                Concluir Edição
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="gap-2"
          >
            <XCircle className="w-4 h-4" />
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            className="gap-2 bg-green-600 hover:bg-green-700"
            disabled={!editedMessage.trim()}
          >
            <Send className="w-4 h-4" />
            Enviar Mensagem
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
