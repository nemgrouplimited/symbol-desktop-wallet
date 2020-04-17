/**
 * Copyright 2020 NEM Foundation (https://nem.io)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import {Component, Vue} from 'vue-property-decorator'
import {mapGetters} from 'vuex'
import {MnemonicPassPhrase} from 'symbol-hd-wallets'
import {NetworkType, Password, Account} from 'symbol-sdk'
import TransportWebUSB from '@ledgerhq/hw-transport-webusb'
import {SymbolLedger} from '@/core/utils/Ledger'

// internal dependencies
import {ValidationRuleset} from '@/core/validation/ValidationRuleset'
import {DerivationService} from '@/services/DerivationService'
import {AESEncryptionService} from '@/services/AESEncryptionService'
import {NotificationType} from '@/core/utils/NotificationType'
import {WalletService} from '@/services/WalletService'
import {WalletModel,WalletType} from '@/core/database/entities/WalletModel'
// child components
import {ValidationObserver, ValidationProvider} from 'vee-validate'
// @ts-ignore
import ErrorTooltip from '@/components/ErrorTooltip/ErrorTooltip.vue'
// @ts-ignore
import FormWrapper from '@/components/FormWrapper/FormWrapper.vue'
// @ts-ignore
import FormRow from '@/components/FormRow/FormRow.vue'
// @ts-ignore
import ModalFormAccountUnlock from '@/views/modals/ModalFormAccountUnlock/ModalFormAccountUnlock.vue'
// configuration
import appConfig from '@/../config/app.conf.json'
import {AccountModel} from '@/core/database/entities/AccountModel'
import {SimpleObjectStorage} from '@/core/database/backends/SimpleObjectStorage'

const {MAX_SEED_WALLETS_NUMBER} = appConfig.constants

@Component({
  components: {
    ValidationObserver,
    ValidationProvider,
    ErrorTooltip,
    FormWrapper,
    FormRow,
    ModalFormAccountUnlock,
  },
  computed: {
    ...mapGetters({
      networkType: 'network/networkType',
      currentAccount: 'account/currentAccount',
      knownWallets: 'wallet/knownWallets',
    }),
  },
})
export class FormSubWalletCreationTs extends Vue {
  /**
   * Currently active account
   */
  public currentAccount: AccountModel

  public hasSubAccount :boolean
  /**
   * Known wallets identifiers
   */
  public knownWallets: WalletModel[]

  /**
   * Currently active network type
   */
  public networkType: NetworkType

  /**
   * Wallets repository
   */
  public walletService: WalletService

  /**
   * Derivation paths service
   */
  public paths: DerivationService

  /**
   * Validation rules
   */
  public validationRules = ValidationRuleset

  /**
   * Whether account is currently being unlocked
   */
  public isUnlockingAccount: boolean = false

  /**
   * Current unlocked password
   * @var {Password}
   */
  public currentPassword: Password

  /**
   * Form fields
   * @var {Object}
   */
  public formItems = {
    type: 'child_wallet',
    privateKey: '',
    name: '',
  }

  /**
   * Type the ValidationObserver refs
   * @type {{
   *     observer: InstanceType<typeof ValidationObserver>
   *   }}
   */
  public $refs!: {
    observer: InstanceType<typeof ValidationObserver>
  }

  public created() {
    this.walletService = new WalletService()
    this.paths = new DerivationService()
  }

  /// region computed properties getter/setter
  public get hasAccountUnlockModal(): boolean {
    return this.isUnlockingAccount
  }

  public set hasAccountUnlockModal(f: boolean) {
    this.isUnlockingAccount = f
  }

  public get knownPaths(): string[] {
    if (!this.knownWallets || !this.knownWallets.length) {
      return []
    }
    // filter wallets to only known wallet names
    return this.knownWallets.map(w => w.path).filter(p => p)
  }

  /// end-region computed properties getter/setter

  /**
   * Submit action asks for account unlock
   * @return {void}
   */
  public currentWallet: WalletModel

  public get isLedger():boolean{
    return this.currentWallet.type == WalletType.fromDescriptor('Ledger')
  }

  public onSubmit() {
    const values = {...this.formItems}
    const type = values.type && [ 'child_wallet', 'privatekey_wallet' ].includes(values.type)
      ? values.type
      : 'child_wallet'
     if (this.isLedger && type =="child_wallet"){
      this.deriveNextChildWallet(values.name)
     } 
     else this.hasAccountUnlockModal = true

  }

  /**
   * When account is unlocked, the sub wallet can be created
   */
  
  public async onAccountUnlocked(account: Account, password: Password) { 
    this.currentPassword = password

    // - interpret form items
    const values = {...this.formItems}
    const type = values.type && [ 'child_wallet', 'privatekey_wallet' ].includes(values.type)
      ? values.type
      : 'child_wallet'

    try {
      // - create sub wallet (can be either derived or by private key)
      let subWallet: WalletModel
      switch (type) {
        default:
        case 'child_wallet':
          subWallet = this.deriveNextChildWallet(values.name)
          break

        case 'privatekey_wallet':
          subWallet = this.walletService.getSubWalletByPrivateKey(
            this.currentAccount,
            this.currentPassword,
            this.formItems.name,
            this.formItems.privateKey,
            this.networkType,
          )
          break
      }

      // - return if subWallet is undefined
      if (!subWallet) return

      // Verify that the import is repeated
      const hasAddressInfo = this.knownWallets.find(w => w.address === subWallet.address)
      if (hasAddressInfo !== undefined) {
        this.$store.dispatch('notification/ADD_ERROR',
          `This private key already exists. The account name is ${hasAddressInfo.name}`)
        return null
      }

      // - remove password before GC
      this.currentPassword = null

      // - use repositories for storage
      this.walletService.saveWallet(subWallet)

      // - update app state
      await this.$store.dispatch('account/ADD_WALLET', subWallet)
      await this.$store.dispatch('wallet/SET_CURRENT_WALLET', subWallet)
      await this.$store.dispatch('wallet/SET_KNOWN_WALLETS', this.currentAccount.wallets)
      this.$store.dispatch('notification/ADD_SUCCESS', NotificationType.OPERATION_SUCCESS)
      this.$emit('submit', this.formItems)
    } catch (e) {
      this.$store.dispatch('notification/ADD_ERROR', 'An error happened, please try again.')
      console.error(e)
    }
  }

  /**
   * Use HD wallet derivation to get next child wallet
   * @param {string} childWalletName
   * @return {WalletModel}
   */
  private deriveNextChildWallet(childWalletName: string): WalletModel | null {
    // - don't allow creating more than 10 wallets
    if (this.knownPaths.length >= MAX_SEED_WALLETS_NUMBER) {
      this.$store.dispatch(
        'notification/ADD_ERROR',
        this.$t(NotificationType.TOO_MANY_SEED_WALLETS_ERROR,
          {maxSeedWalletsNumber: MAX_SEED_WALLETS_NUMBER}),
      )
      return null
    }
    if(this.isLedger){
      this.importSubAccountFromLedger(childWalletName).then(
        (res)=>{
          this.walletService.saveWallet(res);
           // - update app state
          this.$store.dispatch('account/ADD_WALLET', res)
          this.$store.dispatch('wallet/SET_CURRENT_WALLET', res)
          this.$store.dispatch('wallet/SET_KNOWN_WALLETS', this.currentAccount.wallets)
          this.$store.dispatch('notification/ADD_SUCCESS', NotificationType.OPERATION_SUCCESS)
          this.$emit('submit', this.formItems)
        }
      ).catch(
        (err)=> console.log(err)
      );
    } else {
      // - get next path
      const nextPath = this.paths.getNextAccountPath(this.knownPaths)

      this.$store.dispatch('diagnostic/ADD_DEBUG',
        'Adding child wallet with derivation path: ' + nextPath)

      // - decrypt mnemonic
      const encSeed = this.currentAccount.seed
      const passphrase = AESEncryptionService.decrypt(encSeed, this.currentPassword)
      const mnemonic = new MnemonicPassPhrase(passphrase)

      // create account by mnemonic
      return this.walletService.getChildWalletByPath(
        this.currentAccount,
        this.currentPassword,
        mnemonic,
        nextPath,
        this.networkType,
        childWalletName,
      )
    } 
  }

  async importSubAccountFromLedger(childWalletName: string) {
    const subWalletName = childWalletName
    const accountPath = this.currentWallet.path
    const currentAccountIndex = accountPath.substring(accountPath.length-2,accountPath.length-1)
    const numAccount = this.knownPaths.length
    var accountIndex
    if(numAccount<= Number(currentAccountIndex) ){
      accountIndex = numAccount+Number(currentAccountIndex)
    } else {
      accountIndex = numAccount+1
    }
    try {
      this.$Notice.success({
        title: this['$t']('Verify information in your device!') + ''
      })
      const transport = await TransportWebUSB.create();
      const symbolLedger = new SymbolLedger(transport, "XYM");
      const accountResult = await symbolLedger.getAccount(`m/44'/4343'/${this.networkType}'/0'/${accountIndex}'`)
      const { address, publicKey, path } = accountResult;
      transport.close()

      const accName = Object.values(this.currentAccount)[2]

      return {
        id: SimpleObjectStorage.generateIdentifier(),
        accountName: accName,
        name: subWalletName,
        node: '',
        type: WalletType.fromDescriptor('Seed'),
        address: address,
        publicKey: publicKey.toUpperCase(),
        encPrivate: '',
        encIv: '',
        path: path,
        isMultisig: false,
      }
    } catch (e) {
      this.$store.dispatch('SET_UI_DISABLED', {
          isDisabled: false,
          message: ""
      });
      this.$Notice.error({
          title: this['$t']('CONDITIONS_OF_USE_NOT_SATISFIED') + ''
      })
    }
  }
}
