import { resetStubs } from '../mockApis/wiremock'

import auth from '../mockApis/auth'
import tokenVerification from '../mockApis/tokenVerification'
import welcome from '../mockApis/welcome'

export default (on: (string, Record) => void): void => {
  on('task', {
    reset: resetStubs,

    getSignInUrl: auth.getSignInUrl,
    stubSignIn: auth.stubSignIn,

    stubAuthUser: auth.stubUser,
    stubAuthPing: auth.stubPing,

    stubTokenVerificationPing: tokenVerification.stubPing,

    stubExpectedArrivals: welcome.stubExpectedArrivals,
    stubWelcomeApiPing: welcome.stubPing,
    stubTemporaryAbsences: welcome.stubTemporaryAbsences,
  })
}
