declare module 'welcome' {
  import { LocationType } from '../../services/expectedArrivalsService'

  export type Movement = schemas['Movement']

  export type TemporaryAbsence = {
    firstName: string
    lastName: string
    dateOfBirth: string
    prisonNumber: string
    reasonForAbsence: string
  }

  export interface schemas {
    /** A movement into prison */
    Movement: {
      id?: string
      firstName: string
      lastName: string
      dateOfBirth: string
      prisonNumber: string
      pncNumber: string
      date: string
      fromLocation: string
      fromLocationType: LocationType
    }
    ErrorResponse: {
      status: number
      errorCode?: number
      userMessage?: string
      developerMessage?: string
      moreInfo?: string
    }
  }
}
