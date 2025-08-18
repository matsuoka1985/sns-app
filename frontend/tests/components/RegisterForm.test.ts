import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, createApp } from 'vue';
import { configure } from 'vee-validate';
import RegisterForm from '~/components/RegisterForm.vue';

// VeeValidateの設定
configure({
  validateOnBlur: true,
  validateOnChange: false,
  validateOnInput: false,
  validateOnModelUpdate: false,
});

// Nuxtアプリケーションのモック
vi.mock('#app', () => ({
  useNuxtApp: () => ({
    $firebaseAuth: {
      onAuthStateChanged: vi.fn()
    }
  }),
  $fetch: vi.fn()
}));

describe('RegisterForm', () => {
  describe('コンポーネントの基本動作', () => {
    it('RegisterFormコンポーネントが正しくマウントされ、フォーム要素が存在する', async () => {
      const wrapper = mount(RegisterForm);
      
      // 基本的なコンポーネントの存在確認
      expect(wrapper.find('form').exists()).toBe(true);
      expect(wrapper.find('input[name="name"]').exists()).toBe(true);
      expect(wrapper.find('input[name="email"]').exists()).toBe(true);
      expect(wrapper.find('input[name="password"]').exists()).toBe(true);
      expect(wrapper.find('button[type="submit"]').exists()).toBe(true);
      
      // フォームタイトルの確認
      expect(wrapper.text()).toContain('新規登録');
      
      // 入力フィールドの操作確認
      const nameInput = wrapper.find('input[name="name"]');
      await nameInput.setValue('テストユーザー');
      expect((nameInput.element as HTMLInputElement).value).toBe('テストユーザー');
    });
  });

  describe('ユーザーネームのバリデーション', () => {
    it('ユーザーネーム入力欄を触った後に空でblurすると、バリデーションメッセージが表示される', async () => {
      const wrapper = mount(RegisterForm);
      
      const nameInput = wrapper.find('input[name="name"]');
      
      // 1. 入力欄に値を入れて「触った」状態にする
      await nameInput.setValue('test'); // 入力値を設定
      await nameInput.trigger('input'); // 入力イベントをトリガー
      await nextTick();
      
      // VueとVeeValidateの処理を完全に待つ
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 2. 空に戻してblur（フォーカスを外す）
      await nameInput.setValue('');
      await nameInput.trigger('blur');
      await nextTick();
      
      // VeeValidateのバリデーション処理を待つ
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // VeeValidateのバリデーションメッセージが表示されることを期待
      expect(wrapper.text()).toContain('ユーザーネームを入力してください');
    });

    it('ユーザーネーム入力欄に21文字以上を入力してblurすると、文字数制限バリデーションメッセージが表示される', async () => {
      const wrapper = mount(RegisterForm);
      
      const nameInput = wrapper.find('input[name="name"]');
      
      // 1. 入力欄に21文字（制限超過）を設定
      await nameInput.setValue('これは二十一文字を超える長いユーザーネームです'); // 21文字以上の入力値を設定
      await nameInput.trigger('input'); // 入力イベントをトリガー
      await nameInput.trigger('blur'); // blurイベントをトリガー
      await nextTick();
      
      // VeeValidateのバリデーション処理を待つ
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // VeeValidateのバリデーションメッセージが表示されることを期待
      expect(wrapper.text()).toContain('20文字以内で入力してください');
    });
  });

  describe('メールアドレスのバリデーション', () => {
    it('メールアドレス入力欄を触った後に空でblurすると、バリデーションメッセージが表示される', async () => {
      const wrapper = mount(RegisterForm);
      
      const emailInput = wrapper.find('input[name="email"]');
      
      // 1. 入力欄に値を入れて「触った」状態にする
      await emailInput.setValue('test@example.com'); // 入力値を設定
      await emailInput.trigger('input'); // 入力イベントをトリガー
      await nextTick();
      
      // VueとVeeValidateの処理を完全に待つ
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 2. 空に戻してblur（フォーカスを外す）
      await emailInput.setValue('');
      await emailInput.trigger('blur');
      await nextTick();
      
      // VeeValidateのバリデーション処理を待つ
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // VeeValidateのバリデーションメッセージが表示されることを期待
      expect(wrapper.text()).toContain('メールアドレスを入力してください');
    });

    it('メールアドレス入力欄に不正な形式を入力してblurすると、形式バリデーションメッセージが表示される', async () => {
      const wrapper = mount(RegisterForm);
      
      const emailInput = wrapper.find('input[name="email"]');
      
      // 1. 入力欄に不正なメールアドレス形式を入力
      await emailInput.setValue('invalid-email'); // 不正な形式の入力値を設定
      await emailInput.trigger('input'); // 入力イベントをトリガー
      await emailInput.trigger('blur'); // blurイベントをトリガー
      await nextTick();
      
      // VeeValidateのバリデーション処理を待つ
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // VeeValidateのバリデーションメッセージが表示されることを期待
      expect(wrapper.text()).toContain('正しいメールアドレスを入力してください');
    });
  });

  describe('パスワードのバリデーション', () => {
    it('パスワード入力欄を触った後に空でblurすると、バリデーションメッセージが表示される', async () => {
      const wrapper = mount(RegisterForm);
      
      const passwordInput = wrapper.find('input[name="password"]');
      
      // 1. 入力欄に値を入れて「触った」状態にする
      await passwordInput.setValue('password123'); // 入力値を設定
      await passwordInput.trigger('input'); // 入力イベントをトリガー
      await nextTick();
      
      // VueとVeeValidateの処理を完全に待つ
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 2. 空に戻してblur（フォーカスを外す）
      await passwordInput.setValue('');
      await passwordInput.trigger('blur');
      await nextTick();
      
      // VeeValidateのバリデーション処理を待つ
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // VeeValidateのバリデーションメッセージが表示されることを期待
      expect(wrapper.text()).toContain('パスワードを入力してください');
    });

    it('パスワード入力欄に6文字未満を入力してblurすると、文字数バリデーションメッセージが表示される', async () => {
      const wrapper = mount(RegisterForm);
      
      const passwordInput = wrapper.find('input[name="password"]');
      
      // 1. 入力欄に6文字未満の値を入れて「触った」状態にする
      await passwordInput.setValue('12345'); // 5文字の入力値を設定
      await passwordInput.trigger('input'); // 入力イベントをトリガー
      await passwordInput.trigger('blur'); // blurイベントをトリガー
      await nextTick();
      
      // VeeValidateのバリデーション処理を待つ
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // VeeValidateのバリデーションメッセージが表示されることを期待
      expect(wrapper.text()).toContain('6文字以上で入力してください');
    });
  });
});