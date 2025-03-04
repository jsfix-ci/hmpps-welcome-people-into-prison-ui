import {
  RecentArrival,
  Arrival,
  ArrivalResponse,
  PotentialMatchCriteria,
  PotentialMatch,
  PrisonerDetails,
  Sex,
  LocationType,
} from 'welcome'
import moment, { type Moment } from 'moment'
import type { Readable } from 'stream'
import { groupBy, compareByFullName, compareByDateAndTime } from '../utils/utils'
import type { RestClientBuilder, WelcomeClient, HmppsAuthClient } from '../data'
import logger from '../../logger'
import { RaiseAnalyticsEvent } from './raiseAnalyticsEvent'
import { NewArrival } from '../routes/bookedtoday/arrivals/state'
import type { BodyScanInfoDecorator, WithBodyScanInfo } from './bodyScanInfoDecorator'
import type { MatchTypeDecorator, WithMatchType } from './matchTypeDecorator'

export type DecoratedArrival = WithBodyScanInfo<Arrival> & WithMatchType<Arrival>

export default class ExpectedArrivalsService {
  constructor(
    private readonly hmppsAuthClient: HmppsAuthClient,
    private readonly welcomeClientFactory: RestClientBuilder<WelcomeClient>,
    private readonly raiseAnalyticsEvent: RaiseAnalyticsEvent,
    private readonly bodyScanDecorator: BodyScanInfoDecorator,
    private readonly matchTypeDecorator: MatchTypeDecorator
  ) {}

  private async getExpectedArrivals(agencyId: string, now: Moment): Promise<Arrival[]> {
    const token = await this.hmppsAuthClient.getSystemClientToken()
    const welcomeClient = this.welcomeClientFactory(token)
    const expectedArrivals = await welcomeClient.getExpectedArrivals(agencyId, now)
    return expectedArrivals.sort(compareByFullName)
  }

  private async getRecentArrivals(agencyId: string, twoDaysAgo: Moment, today: Moment): Promise<RecentArrival[]> {
    const token = await this.hmppsAuthClient.getSystemClientToken()
    const welcomeClient = this.welcomeClientFactory(token)
    const recentArrivals = await welcomeClient.getRecentArrivals(agencyId, twoDaysAgo, today)
    return recentArrivals.content.sort(compareByDateAndTime(a => a.movementDateTime))
  }

  private async getTransfers(agencyId: string): Promise<Arrival[]> {
    const token = await this.hmppsAuthClient.getSystemClientToken()
    const welcomeClient = this.welcomeClientFactory(token)
    const transfers = await welcomeClient.getTransfers(agencyId)
    return transfers.map(transfer => ({ ...transfer, fromLocationType: 'PRISON' as const })).sort(compareByFullName)
  }

  private isArrivalArrivedOnDay = (day: Moment) => (recentArrival: WithBodyScanInfo<RecentArrival>) => {
    return moment(recentArrival.movementDateTime).startOf('day').valueOf() === day.startOf('day').valueOf()
  }

  public async getRecentArrivalsGroupedByDate(
    agencyId: string
  ): Promise<Map<Moment, WithBodyScanInfo<RecentArrival>[]>> {
    const today = moment().startOf('day')
    const oneDayAgo = moment().subtract(1, 'days').startOf('day')
    const twoDaysAgo = moment().subtract(2, 'days').startOf('day')

    const rawRecentArrivals = await this.getRecentArrivals(agencyId, twoDaysAgo, today)
    const recentArrivals = await this.bodyScanDecorator.decorate(rawRecentArrivals)
    const mappedArrivals = new Map<Moment, WithBodyScanInfo<RecentArrival>[]>()

    mappedArrivals.set(today, recentArrivals.filter(this.isArrivalArrivedOnDay(today)))
    mappedArrivals.set(oneDayAgo, recentArrivals.filter(this.isArrivalArrivedOnDay(oneDayAgo)))
    mappedArrivals.set(twoDaysAgo, recentArrivals.filter(this.isArrivalArrivedOnDay(twoDaysAgo)))
    return mappedArrivals
  }

  public async getRecentArrivalsSearchResults(agencyId: string, searchQuery: string): Promise<RecentArrival[]> {
    const today = moment().startOf('day')
    const twoDaysAgo = moment().subtract(2, 'days').startOf('day')
    const token = await this.hmppsAuthClient.getSystemClientToken()
    const welcomeClient = this.welcomeClientFactory(token)
    const results = await welcomeClient.getRecentArrivals(agencyId, twoDaysAgo, today, searchQuery)
    return results.content
  }

  public async getArrivalsForToday(
    agencyId: string,
    now = () => moment()
  ): Promise<Map<LocationType, DecoratedArrival[]>> {
    const [expectedArrivals, transfers] = await Promise.all([
      this.getExpectedArrivals(agencyId, now()),
      this.getTransfers(agencyId),
    ])
    const allArrivals = [...expectedArrivals, ...transfers]
    const withBodyScan = await this.bodyScanDecorator.decorate(allArrivals)
    const withBodyScanAndMatchType = this.matchTypeDecorator.decorate(withBodyScan)

    return groupBy(withBodyScanAndMatchType, (arrival: DecoratedArrival) => arrival.fromLocationType)
  }

  public async getImage(prisonNumber: string): Promise<Readable> {
    const token = await this.hmppsAuthClient.getSystemClientToken()
    return this.welcomeClientFactory(token).getImage(prisonNumber)
  }

  public async getArrival(id: string): Promise<WithMatchType<Arrival>> {
    const token = await this.hmppsAuthClient.getSystemClientToken()
    const arrival = await this.welcomeClientFactory(token).getArrival(id)
    return this.matchTypeDecorator.decorateSingle(arrival)
  }

  public async getPrisonerDetailsForArrival(id: string): Promise<PrisonerDetails> {
    const token = await this.hmppsAuthClient.getSystemClientToken()
    const arrival = await this.welcomeClientFactory(token).getArrival(id)
    if (arrival.potentialMatches.length > 1) {
      logger.warn(`multiple matches for move: ${id}`)
    }
    return arrival.potentialMatches[0]
  }

  public async confirmArrival(
    prisonId: string,
    username: string,
    id: string,
    arrival: NewArrival
  ): Promise<ArrivalResponse | null> {
    const token = await this.hmppsAuthClient.getSystemClientToken(username)
    const welcomeClient = this.welcomeClientFactory(token)

    return arrival.expected
      ? this.confirmExpectedArrival(welcomeClient, prisonId, id, arrival)
      : this.confirmUnexpectedArrival(welcomeClient, prisonId, arrival)
  }

  private async confirmExpectedArrival(
    welcomeClient: WelcomeClient,
    prisonId: string,
    id: string,
    arrival: NewArrival
  ): Promise<ArrivalResponse | null> {
    const data = await this.getArrival(id)

    const response = await welcomeClient.confirmExpectedArrival(id, {
      firstName: arrival.firstName,
      lastName: arrival.lastName,
      dateOfBirth: arrival.dateOfBirth,
      sex: arrival.sex as Sex,
      prisonId,
      imprisonmentStatus: arrival.imprisonmentStatus,
      movementReasonCode: arrival.movementReasonCode,
      fromLocationId: data.fromLocationId,
      prisonNumber: arrival.prisonNumber,
    })

    if (!response) {
      return null
    }

    this.raiseAnalyticsEvent(
      'Add to the establishment roll',
      'Confirmed arrival',
      `AgencyId: ${prisonId}, From: ${data.fromLocation}, Type: ${data.fromLocationType},`
    )

    return response
  }

  private async confirmUnexpectedArrival(
    welcomeClient: WelcomeClient,
    prisonId: string,
    arrival: NewArrival
  ): Promise<ArrivalResponse | null> {
    const response = await welcomeClient.confirmUnexpectedArrival({
      firstName: arrival.firstName,
      lastName: arrival.lastName,
      dateOfBirth: arrival.dateOfBirth,
      sex: arrival.sex as Sex,
      prisonId,
      imprisonmentStatus: arrival.imprisonmentStatus,
      movementReasonCode: arrival.movementReasonCode,
      fromLocationId: undefined,
      prisonNumber: arrival.prisonNumber,
    })

    if (!response) {
      return null
    }

    this.raiseAnalyticsEvent('Add to the establishment roll', 'Confirmed unexpected arrival', `AgencyId: ${prisonId}`)

    return response
  }

  public async confirmCourtReturn(
    username: string,
    id: string,
    prisonId: string,
    prisonNumber: string
  ): Promise<ArrivalResponse | null> {
    const token = await this.hmppsAuthClient.getSystemClientToken(username)
    return this.welcomeClientFactory(token).confirmCourtReturn(id, prisonId, prisonNumber)
  }

  public async getMatchingRecords(potentialMatchCriteria: PotentialMatchCriteria): Promise<PotentialMatch[]> {
    const token = await this.hmppsAuthClient.getSystemClientToken()
    return this.welcomeClientFactory(token).getMatchingRecords(potentialMatchCriteria)
  }

  public async getPrisonerDetails(prisonNumber: string): Promise<PrisonerDetails> {
    const token = await this.hmppsAuthClient.getSystemClientToken()
    return this.welcomeClientFactory(token).getPrisonerDetails(prisonNumber)
  }
}
