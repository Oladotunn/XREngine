import React, { useRef } from 'react'
import Typography from '@mui/material/Typography'
import InputAdornment from '@mui/material/InputAdornment'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import { Send, FileCopy } from '@mui/icons-material'
import { isShareAvailable } from '@xrengine/engine/src/common/functions/DetectFeatures'
import styles from '../UserMenu.module.scss'
import { InviteService } from '../../../../social/services/InviteService'
import { useDispatch } from '../../../../store'
import { useTranslation } from 'react-i18next'
import { useInviteState } from '../../../../social/services/InviteService'
import { useAuthState } from '../../../services/AuthService'
import { AlertService } from '../../../../common/services/AlertService'

const ShareMenu = (): any => {
  const { t } = useTranslation()
  const [email, setEmail] = React.useState('')
  const refLink = useRef<any>(null!)
  const postTitle = 'AR/VR world'
  const siteTitle = 'XREngine'
  const dispatch = useDispatch()
  const inviteState = useInviteState()
  const copyLinkToClipboard = () => {
    navigator.clipboard.writeText(refLink.current.value)
    AlertService.alertSuccess(t('user:usermenu.share.linkCopied'))
  }
  const selfUser = useAuthState().user

  const shareOnApps = () => {
    navigator
      .share({
        title: `${postTitle} | ${siteTitle}`,
        text: `Check out ${postTitle} on ${siteTitle}`,
        url: document.location.href
      })
      .then(() => {
        console.log('Successfully shared')
      })
      .catch((error) => {
        console.error('Something went wrong sharing the world', error)
      })
  }

  const packageInvite = async (): Promise<void> => {
    const sendData = {
      type: 'friend',
      token: email,
      inviteCode: null,
      identityProviderType: 'email',
      targetObjectId: inviteState.targetObjectId.value,
      invitee: null
    }
    InviteService.sendInvite(sendData)
    setEmail('')
  }

  const handleChang = (e) => {
    setEmail(e.target.value)
  }

  const getInviteLink = () => {
    const location = new URL(window.location as any)
    let params = new URLSearchParams(location.search)
    if (selfUser?.inviteCode.value != null) {
      params.append('inviteCode', selfUser.inviteCode.value)
      location.search = params.toString()
      return location
    } else {
      return location
    }
  }

  return (
    <div className={styles.menuPanel}>
      <div className={styles.sharePanel}>
        <Typography variant="h1" className={styles.panelHeader}>
          {t('user:usermenu.share.title')}
        </Typography>
        <TextField
          className={styles.copyField}
          size="small"
          variant="outlined"
          value={getInviteLink()}
          disabled={true}
          inputRef={refLink}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end" onClick={copyLinkToClipboard}>
                <FileCopy />
              </InputAdornment>
            )
          }}
        />
        <TextField
          className={styles.emailField}
          style={{ color: '#fff' }}
          size="small"
          placeholder={t('user:usermenu.share.ph-phoneEmail')}
          variant="outlined"
          value={email}
          onChange={(e) => handleChang(e)}
        />
        <div className={styles.sendInviteContainer}>
          <Button className={styles.sendInvite} style={{ color: '#fff' }} onClick={packageInvite}>
            {t('user:usermenu.share.lbl-send-invite')}
          </Button>
        </div>
        {isShareAvailable ? (
          <div className={styles.shareBtnContainer}>
            <Button className={styles.shareBtn} style={{ color: '#fff' }} onClick={shareOnApps}>
              {t('user:usermenu.share.lbl-share')}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default ShareMenu
