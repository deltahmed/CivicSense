"""
Utilitaires pour l'envoi d'emails avec configuration anti-spam
"""
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags


def send_email_safe(
    subject,
    recipient_list,
    text_content=None,
    html_content=None,
    template_name=None,
    context=None,
    reply_to=None,
    cc=None,
    bcc=None,
):
    """
    Envoie un email avec les en-têtes anti-spam configurés.
    
    Args:
        subject: Sujet de l'email
        recipient_list: Liste des destinataires
        text_content: Contenu texte (optionnel)
        html_content: Contenu HTML (optionnel)
        template_name: Nom du template à utiliser (optionnel)
        context: Contexte du template (optionnel)
        reply_to: Email de réponse (optionnel)
        cc: Liste des CC (optionnel)
        bcc: Liste des BCC (optionnel)
    
    Returns:
        Nombre d'emails envoyés
    """
    
    # Utiliser un template si fourni
    if template_name and context:
        html_content = render_to_string(template_name, context)
        if not text_content:
            text_content = strip_tags(html_content)
    
    # Utiliser le contenu HTML si pas de texte
    if not text_content and html_content:
        text_content = strip_tags(html_content)
    
    # Créer le message avec support HTML
    msg = EmailMultiAlternatives(
        subject=subject,
        body=text_content or "",
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=recipient_list,
        cc=cc or [],
        bcc=bcc or [],
        reply_to=reply_to or [settings.DEFAULT_FROM_EMAIL],
    )
    
    # Ajouter les en-têtes anti-spam (utiliser extra_headers)
    msg.extra_headers = {
        'X-Priority': '3',
        'Precedence': 'bulk',
        'List-Help': f'<mailto:{settings.DEFAULT_FROM_EMAIL}>',
        'List-Unsubscribe': f'<mailto:{settings.DEFAULT_FROM_EMAIL}?subject=unsubscribe>',
        'X-Mailer': 'CivicSense',
        'X-MSMail-Priority': 'Normal',
        'Importance': 'Normal',
    }
    
    # Ajouter contenu HTML s'il existe
    if html_content:
        msg.attach_alternative(html_content, "text/html")
    
    # Envoyer
    try:
        result = msg.send(fail_silently=False)
        return result
    except Exception as e:
        print(f"Erreur lors de l'envoi d'email: {e}")
        return 0


def send_verification_email(user_email, verification_token, verification_url=None):
    """Informe l'utilisateur que sa demande est en cours d'examen par un administrateur."""
    subject = "Demande d'inscription reçue - CivicSense"

    text_content = f"""
Bienvenue sur CivicSense!

Votre demande d'inscription a bien été reçue.

Un administrateur va examiner votre compte dans les meilleurs délais.
Vous recevrez un email de confirmation dès que votre compte sera approuvé.

Si vous n'avez pas créé ce compte, ignorez cet email.
    """

    html_content = """
<html>
  <body style="font-family: sans-serif; color: #1e293b; max-width: 480px; margin: 0 auto; padding: 2rem;">
    <h2 style="color: #4f46e5;">Demande d'inscription reçue</h2>
    <p>Bienvenue sur <strong>CivicSense</strong>&nbsp;!</p>
    <p>Votre demande d'inscription a bien été reçue.</p>
    <p>Un administrateur va examiner votre compte dans les meilleurs délais.<br/>
       Vous recevrez un email de confirmation dès que votre compte sera approuvé.</p>
    <hr style="border:none; border-top:1px solid #e2e8f0; margin: 1.5rem 0;"/>
    <p style="font-size: 0.8rem; color: #64748b;">
      Si vous n'avez pas créé ce compte, ignorez cet email.
    </p>
  </body>
</html>
    """

    return send_email_safe(
        subject=subject,
        recipient_list=[user_email],
        text_content=text_content,
        html_content=html_content,
    )


def send_password_reset_email(user_email, reset_token):
    """Envoie un email de réinitialisation de mot de passe"""
    subject = "Réinitialiser votre mot de passe - CivicSense"
    
    text_content = f"""
Dernièrement, vous avez demandé à réinitialiser votre mot de passe CivicSense.

Cliquez sur le lien ci-dessous:
http://votresite.com/reset/{reset_token}

Si vous n'avez pas deman demandé cela, vous pouvez ignorer cet email.
    """
    
    html_content = f"""
<html>
    <body>
        <h2>Réinitialisation de mot de passe</h2>
        <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
        <p><a href="http://votresite.com/reset/{reset_token}">Réinitialiser mon mot de passe</a></p>
        <p>Si vous n'avez pas demandé cela, vous pouvez ignorer cet email.</p>
    </body>
</html>
    """
    
    return send_email_safe(
        subject=subject,
        recipient_list=[user_email],
        text_content=text_content,
        html_content=html_content,
    )


def send_approval_email(user_email, user_pseudo):
    """Envoie un email de confirmation d'approbation du compte"""
    subject = "Votre compte CivicSense a été approuvé!"
    
    text_content = f"""
Bonjour {user_pseudo},

Félicitations! Votre compte CivicSense a été approuvé par l'administrateur.

Vous pouvez maintenant vous connecter et accéder à toutes les fonctionnalités de la plateforme.

Cordialement,
L'équipe CivicSense
    """
    
    html_content = f"""
<html>
    <body>
        <h2>Compte approuvé!</h2>
        <p>Bonjour <strong>{user_pseudo}</strong>,</p>
        <p>Félicitations! Votre compte CivicSense a été <strong>approuvé</strong> par l'administrateur.</p>
        <p>Vous pouvez maintenant vous connecter et accéder à toutes les fonctionnalités de la plateforme.</p>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">
            Cordialement,<br/>
            L'équipe CivicSense
        </p>
    </body>
</html>
    """
    
    return send_email_safe(
        subject=subject,
        recipient_list=[user_email],
        text_content=text_content,
        html_content=html_content,
    )


def send_rejection_email(user_email, user_pseudo, motif):
    """Envoie un email de refus d'inscription avec motif"""
    subject = "Demande d'inscription CivicSense - Refusée"
    
    text_content = f"""
Bonjour {user_pseudo},

Votre demande d'inscription à CivicSense a été refusée.

Motif: {motif}

Si vous pensez que c'est une erreur, veuillez contacter l'administrateur.

Cordialement,
L'équipe CivicSense
    """
    
    html_content = f"""
<html>
    <body>
        <h2>Demande d'inscription - Refusée</h2>
        <p>Bonjour <strong>{user_pseudo}</strong>,</p>
        <p>Nous regrettons de vous informer que votre demande d'inscription a été <strong>refusée</strong>.</p>
        <p><strong>Motif:</strong> {motif}</p>
        <p style="margin-top: 15px; color: #666;">
            Si vous pensez que c'est une erreur, veuillez contacter l'administrateur.
        </p>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">
            Cordialement,<br/>
            L'équipe CivicSense
        </p>
    </body>
</html>
    """
    
    return send_email_safe(
        subject=subject,
        recipient_list=[user_email],
        text_content=text_content,
        html_content=html_content,
    )
