declare module 'welcome' {
  export type Arrival = schemas['Arrival']
  export type RecentArrival = schemas['RecentArrival']
  export type Transfer = schemas['Transfer']
  export type TemporaryAbsence = schemas['TemporaryAbsence']
  export type ConfirmArrivalDetail = schemas['ConfirmArrivalDetail']
  export type ImprisonmentStatus = schemas['ImprisonmentStatus']
  export type Prison = schemas['Prison']
  export type UserCaseLoad = schemas['UserCaseLoad']
  export type ArrivalResponse = schemas['ArrivalResponse']
  export type PotentialMatchCriteria = schemas['PotentialMatchCriteria']
  export type PotentialMatch = schemas['PotentialMatch']
  export type PrisonerDetails = schemas['PrisonerDetails']

  export type LocationType = 'COURT' | 'CUSTODY_SUITE' | 'PRISON' | 'OTHER'

  export type Sex =
    // FEMALE =
    | 'F'
    // MALE =
    | 'M'
    // NOT_KNOWN =
    | 'NK'
    // NOT_SPECIFIED =
    | 'NS'
    // REFUSED =
    | 'REF'

  export type SexKeys = 'FEMALE' | 'MALE' | 'TRANS'

  export type ArrivalType =
    | 'NEW_BOOKING'
    | 'TRANSFER'
    | 'FROM_TEMPORARY_ABSENCE'
    | 'FROM_COURT'
    // The following shouldn't really happen
    | 'CURRENTLY_IN'
    | 'UNKNOWN'

  export interface PaginatedResponse<T> {
    content: T[]
    pageable: {
      sort: { empty: boolean; sorted: boolean; unsorted: boolean }
      offset: number
      pageSize: number
      pageNumber: number
      paged: boolean
      unpaged: boolean
    }
    last: boolean
    totalPages: number
    totalElements: number
    size: number
    number: number
    sort: { empty: boolean; sorted: boolean; unsorted: boolean }
    first: boolean
    numberOfElements: number
    empty: boolean
  }
  export interface schemas {
    Arrival: {
      id?: string
      firstName: string
      lastName: string
      dateOfBirth: string
      prisonNumber: string
      pncNumber: string
      date: string
      fromLocation: string
      fromLocationId?: string
      fromLocationType: LocationType
      gender?: SexKeys
      potentialMatches?: PotentialMatch[]
      isCurrentPrisoner: boolean
    }
    RecentArrival: {
      prisonNumber: string
      dateOfBirth: string
      firstName: string
      lastName: string
      movementDateTime: string
      location: string
    }
    Transfer: {
      firstName: string
      lastName: string
      dateOfBirth: string
      prisonNumber: string
      pncNumber: string
      date: string
      fromLocation: string
    }
    TemporaryAbsence: {
      firstName: string
      lastName: string
      dateOfBirth: string
      prisonNumber: string
      reasonForAbsence: string
      movementDateTime: string
    }
    ErrorResponse: {
      status: number
      errorCode?: number
      userMessage?: string
      developerMessage?: string
      moreInfo?: string
    }
    ConfirmArrivalDetail: {
      firstName: string
      lastName: string
      dateOfBirth: string
      sex: Sex
      prisonId: string
      fromLocationId?: string
      imprisonmentStatus: string
      movementReasonCode: string
      prisonNumber: string
    }
    ImprisonmentStatus: {
      code: string
      description: string
      imprisonmentStatusCode: string
      secondLevelTitle?: string
      secondLevelValidationMessage?: string
      movementReasons: { description?: string; movementReasonCode: string }[]
    }
    Prison: {
      description: string
    }
    ArrivalResponse: {
      prisonNumber: string
      location: string
    }
    UserCaseLoad: {
      caseLoadId: string
      description: string
    }
    PotentialMatchCriteria: {
      firstName?: string
      lastName?: string
      dateOfBirth?: string
      pncNumber?: string
      prisonNumber?: string
    }
    PotentialMatch: {
      firstName: string
      lastName: string
      dateOfBirth: string
      prisonNumber?: string
      pncNumber?: string
      croNumber?: string
      sex: SexKeys
      arrivalType: ArrivalType
      arrivalTypeDescription: string
    }
    PrisonerDetails: {
      firstName: string
      lastName: string
      dateOfBirth: string
      prisonNumber?: string
      pncNumber?: string
      croNumber?: string
      sex: SexKeys
      arrivalType: ArrivalType
      arrivalTypeDescription: string
    }
  }
}
