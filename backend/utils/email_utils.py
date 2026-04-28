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
    """Envoie un email de vérification.

    Accepts an optional `verification_url` full link (preferred). If not
    provided, falls back to a simple path using the token.
    """
    subject = "Vérifiez votre adresse email - CivicSense"

    if verification_url:
        link = verification_url
    else:
        link = f"/api/users/verify/{verification_token}/"

    text_content = f"""
Bienvenue sur CivicSense!

Veuillez cliquer sur le lien ci-dessous pour vérifier votre adresse email:
{link}

Si vous n'avez pas créé ce compte, ignorez cet email.
    """

    html_content = f"""
<html>
    <body>
        <h2>Bienvenue sur CivicSense!</h2>
        <p>Veuillez cliquer sur le lien ci-dessous pour vérifier votre adresse email:</p>
        <p><a href="{link}">Vérifier mon email</a></p>
        <p>Si vous n'avez pas créé ce compte, ignorez cet email.</p>
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
