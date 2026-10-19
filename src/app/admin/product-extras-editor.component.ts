import { ChangeDetectorRef, Component, Input, OnChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  DbProduct, DbOptionGroup, DbProductOption, GroupDraft, OptionDraft, RestaurantApiService
} from '../core/restaurant-api.service';

@Component({
  selector: 'app-product-extras-editor',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './product-extras-editor.component.html'
})
export class ProductExtrasEditorComponent implements OnChanges {
  private readonly api = inject(RestaurantApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readId = 0;

  @Input({ required: true }) restaurantId = '';
  @Input() products: DbProduct[] = [];
  @Input() editable = false;

  selectedProductId = '';
  groups: DbOptionGroup[] = [];
  options: DbProductOption[] = [];
  groupEditing: GroupDraft | null = null;
  optionEditing: OptionDraft | null = null;
  optionGroupId = '';
  loading = true;
  busy = false;
  error = '';
  notice = '';

  ngOnChanges(): void {
    if (!this.products.some(p => p.id === this.selectedProductId))
      this.selectedProductId = this.products[0]?.id ?? '';
    this.groupEditing = null;
    this.optionEditing = null;
    void this.reload();
  }

  groupsForProduct(): DbOptionGroup[] {
    return this.groups.filter(g => g.product_id === this.selectedProductId);
  }
  optionsForGroup(id: string): DbProductOption[] {
    return this.options.filter(o => o.group_id === id);
  }
  format(cents: number): string { return 'S/' + (cents / 100).toFixed(2); }
  changeProduct(id: string): void {
    this.selectedProductId = id;
    this.groupEditing = null;
    this.optionEditing = null;
    this.error = '';
  }
  newGroup(): void {
    if (!this.editable || !this.selectedProductId) return;
    this.groupEditing = { name: '', min_select: 0, max_select: 1, active: true };
    this.optionEditing = null;
  }
  editGroup(g: DbOptionGroup): void {
    if (!this.editable) return;
    this.groupEditing = { id: g.id, name: g.name, min_select: g.min_select, max_select: g.max_select, active: g.active };
    this.optionEditing = null;
  }
  newOption(g: DbOptionGroup): void {
    if (!this.editable) return;
    this.optionGroupId = g.id;
    this.optionEditing = { name: '', price: 0, active: true };
    this.groupEditing = null;
  }
  editOption(o: DbProductOption): void {
    if (!this.editable) return;
    this.optionGroupId = o.group_id;
    this.optionEditing = { id: o.id, name: o.name, price: o.extra_price_cents / 100, active: o.active };
    this.groupEditing = null;
  }
  async saveGroup(): Promise<void> {
    if (!this.editable || this.busy || !this.groupEditing || !this.selectedProductId) return;
    const draft = { ...this.groupEditing };
    const productId = this.selectedProductId;
    await this.perform(async () => {
      await this.api.saveOptionGroup(this.restaurantId, productId, draft);
      await this.reload();
      this.groupEditing = null;
      this.notice = 'Grupo de opciones guardado.';
    });
  }
  async saveOption(): Promise<void> {
    if (!this.editable || this.busy || !this.optionEditing || !this.optionGroupId) return;
    const draft = { ...this.optionEditing };
    const groupId = this.optionGroupId;
    await this.perform(async () => {
      await this.api.saveProductOption(this.restaurantId, groupId, draft);
      await this.reload();
      this.optionEditing = null;
      this.notice = 'Complemento guardado.';
    });
  }
  private async reload(): Promise<void> {
    const n = ++this.readId;
    if (!this.restaurantId) return;
    this.loading = true;
    this.cdr.markForCheck();
    try {
      const [groups, options] = await Promise.all([
        this.api.optionGroups(this.restaurantId),
        this.api.productOptions(this.restaurantId)
      ]);
      if (n !== this.readId) return;
      this.groups = groups;
      this.options = options;
    } catch (err) {
      if (n === this.readId) this.error = this.message(err);
    } finally {
      if (n === this.readId) {
        this.loading = false;
        this.cdr.markForCheck();
      }
    }
  }
  private async perform(operation: () => Promise<void>): Promise<void> {
    this.error = '';
    this.notice = '';
    this.busy = true;
    this.cdr.markForCheck();
    try { await operation(); }
    catch (err) { this.error = this.message(err); }
    finally { this.busy = false; this.cdr.markForCheck(); }
  }
  private message(err: unknown): string {
    return err instanceof Error ? err.message : 'No se pudo guardar.';
  }
}
